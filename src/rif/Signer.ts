import { EtherSwap } from "boltz-core/typechain/EtherSwap";
import { Signer, ZeroAddress } from "ethers";
import log from "loglevel";

import { config } from "../config";
import { RBTC } from "../consts/Assets";
import { prefix0x, satoshiToWei } from "../utils/rootstock";
import { getForwarder, getSmartWalletFactory } from "./Contracts";
import { Metadata, estimate, getChainInfo, relay } from "./Relay";
import { calculateGasPrice, getValidUntilTime, isDeployRequest } from "./Utils";
import {
    EnvelopingRequest,
    deployRequestType,
    getEnvelopingRequestDataV4Field,
    relayRequestType,
} from "./types/TypedRequestData";

// With some extra buffer; just in case
export const GasNeededToClaim = BigInt(35355) * 2n;
export const GasNeededToDeploy = 230000n;

export const MaxRelayNonceGap = 10;

const sign = async (signer: Signer, request: EnvelopingRequest) => {
    const { chainId } = await signer.provider.getNetwork();

    const data = getEnvelopingRequestDataV4Field({
        chainId: Number(chainId),
        envelopingRequest: request,
        verifier: request.relayData.callForwarder,
        requestTypes: isDeployRequest(request)
            ? deployRequestType
            : relayRequestType,
    });

    return signer.signTypedData(data.domain, data.types, data.value);
};

// TODO: optimize network requests
export const relayClaimTransaction = async (
    signer: Signer,
    signerRns: string,
    etherSwap: EtherSwap,
    preimage: string,
    amount: number,
    refundAddress: string,
    timeoutBlockHeight: number,
) => {
    const chainInfo = await getChainInfo();
    const callData = etherSwap.interface.encodeFunctionData(
        "claim(bytes32,uint256,address,uint256)",
        [
            prefix0x(preimage),
            satoshiToWei(amount),
            refundAddress,
            timeoutBlockHeight,
        ],
    );

    const smartWalletAddress = await getSmartWalletAddress(signer);
    const smartWalletExists =
        (await signer.provider.getCode(smartWalletAddress.address)) !== "0x";
    log.info("RIF smart wallet exists: ", smartWalletExists);

    const smartWalletFactory = getSmartWalletFactory(signer);

    const feeData = await signer.provider.getFeeData();

    const envelopingRequest: EnvelopingRequest = {
        request: {
            value: "0",
            data: callData,
            tokenGas: "20000",
            tokenContract: ZeroAddress,
            from: await signer.getAddress(),
            to: await etherSwap.getAddress(),
            relayHub: chainInfo.relayHubAddress,
            validUntilTime: getValidUntilTime(),
            tokenAmount: (feeData.gasPrice * GasNeededToDeploy).toString(),
        },
        relayData: {
            feesReceiver: chainInfo.feesReceiver,
            callVerifier: config.assets[RBTC].contracts.deployVerifier,
            gasPrice: (
                await calculateGasPrice(signer.provider, chainInfo.minGasPrice)
            ).toString(),
        },
    };

    if (!smartWalletExists) {
        envelopingRequest.request.recoverer = ZeroAddress;
        envelopingRequest.request.index = Number(smartWalletAddress.nonce);
        envelopingRequest.request.nonce = (
            await smartWalletFactory.nonce(await signer.getAddress())
        ).toString();

        envelopingRequest.relayData.callForwarder =
            await smartWalletFactory.getAddress();
    } else {
        envelopingRequest.request.gas = GasNeededToClaim.toString();
        envelopingRequest.request.nonce = (
            await getForwarder(signer, smartWalletAddress.address).nonce()
        ).toString();

        envelopingRequest.relayData.callForwarder = smartWalletAddress;
    }

    const metadata: Metadata = {
        signature: "",
        relayHubAddress: chainInfo.relayHubAddress,
        relayMaxNonce:
            (await signer.provider.getTransactionCount(
                chainInfo.relayWorkerAddress,
            )) + MaxRelayNonceGap,
    };

    // TODO: remove once this is implemented https://github.com/rsksmart/rif-relay-client/blob/0969a115ea76deef0fee63e77189cc22c0fbd181/src/gasEstimator/utils.ts#L62
    if (!smartWalletExists) {
        metadata.signature = await sign(signer, envelopingRequest);
    }

    const estimateRes = await estimate(envelopingRequest, metadata);
    log.debug("RIF gas estimation response", estimateRes);

    envelopingRequest.request.tokenAmount = estimateRes.requiredTokenAmount;

    // Hack to work around Rabby throwing an error when we ask for signatures too rapidly
    if (signerRns === "io.rabby") {
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }

    metadata.signature = await sign(signer, envelopingRequest);

    const relayRes = await relay(envelopingRequest, metadata);
    return relayRes.txHash;
};

export const getSmartWalletAddress = async (
    signer: Signer,
): Promise<{
    nonce: bigint;
    address: string;
}> => {
    const factory = getSmartWalletFactory(signer);

    const nonce = await factory.nonce(await signer.getAddress());
    const smartWalletAddress: string = await factory.getSmartWalletAddress(
        await signer.getAddress(),
        ZeroAddress,
        nonce,
    );
    log.debug(
        `RIF smart wallet address ${smartWalletAddress} with nonce ${nonce}`,
    );
    return {
        nonce,
        address: smartWalletAddress,
    };
};