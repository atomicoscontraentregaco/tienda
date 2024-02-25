import type { TransactionResponse } from "ethers";
import log from "loglevel";
import { Accessor, Setter, createSignal } from "solid-js";

import { RBTC } from "../consts";
import { useAppContext } from "../context/App";
import { useGlobalContext } from "../context/Global";
import { useWeb3Signer } from "../context/Web3";
import { getSubmarineTransaction } from "../utils/boltzApi";
import {
    address,
    client,
    ethers,
    invoice,
    refund,
    rootstock,
} from "../utils/lazy";
import { LiquidNetwork } from "../utils/types";
import ContractTransaction from "./ContractTransaction";

const RefundButton = ({
    swap,
    setRefundTxId,
}: {
    swap: Accessor<Record<string, any>>;
    setRefundTxId?: Setter<string>;
}) => {
    const {
        setNotificationType,
        setNotification,
        setRefundAddress,
        refundAddress,
        t,
    } = useGlobalContext();

    const { swaps, setSwaps } = useAppContext();

    if (swap() && swap().asset === RBTC) {
        const { getEtherSwap, getSigner } = useWeb3Signer();

        const updateSwaps = (cb: any) => {
            const swapsTmp = swaps();
            const currentSwap = swapsTmp.find((s: any) => swap().id === s.id);
            cb(currentSwap);
            setSwaps(swapsTmp);
        };

        return (
            <ContractTransaction
                onClick={async () => {
                    const [contract, signer] = await Promise.all([
                        getEtherSwap(),
                        getSigner(),
                    ]);

                    const currentSwap = swap();
                    const preimageHash = rootstock.prefix0x(
                        invoice.decodeInvoice(currentSwap.invoice).preimageHash,
                    );

                    let tx: TransactionResponse;

                    if (
                        currentSwap.timeoutBlockHeight <
                        (await signer.provider.getBlockNumber())
                    ) {
                        tx = await contract.refund(
                            preimageHash,
                            rootstock.satoshiToWei(currentSwap.expectedAmount),
                            currentSwap.claimAddress,
                            currentSwap.timeoutBlockHeight,
                        );
                    } else {
                        const { signature } =
                            await client.getSubmarineEipSignature(
                                currentSwap.asset,
                                currentSwap.id,
                            );
                        const decSignature = ethers.Signature.from(signature);

                        tx = await contract.refundCooperative(
                            preimageHash,
                            rootstock.satoshiToWei(currentSwap.expectedAmount),
                            currentSwap.claimAddress,
                            currentSwap.timeoutBlockHeight,
                            decSignature.v,
                            decSignature.r,
                            decSignature.s,
                        );
                    }

                    updateSwaps((current: any) => (current.refundTx = tx.hash));
                    await tx.wait(1);
                }}
                buttonText={t("refund")}
            />
        );
    }

    const [refundRunning, setRefundRunning] = createSignal<boolean>(false);
    const [valid, setValid] = createSignal<boolean>(false);

    const refundAddressChange = (evt: InputEvent, asset: string) => {
        const input = evt.currentTarget as HTMLInputElement;
        const inputValue = input.value.trim();
        try {
            address
                .getAddress(asset)
                .toOutputScript(
                    inputValue,
                    address.getNetwork(asset) as LiquidNetwork,
                );
            input.setCustomValidity("");
            setRefundAddress(inputValue);
            return true;
        } catch (e) {
            log.debug("parsing refund address failed", e);
            input.setCustomValidity("invalid address");
        }

        return false;
    };

    const refundAction = async () => {
        setRefundRunning(true);

        try {
            const transactionToRefund = await getSubmarineTransaction(
                swap().asset,
                swap().id,
            );
            log.debug(
                `got swap transaction for ${swap().id}`,
                transactionToRefund,
            );
            const res = await refund.refund(
                swap(),
                refundAddress(),
                transactionToRefund,
            );

            // save refundTx into swaps json and set it to the current swap
            // only if the swaps was not initiated with the refund json
            // refundjson has no date
            if (res.date !== undefined) {
                const swapsTmp = swaps();
                const currentSwap = swapsTmp.find((s: any) => res.id === s.id);
                currentSwap.refundTx = res.refundTx;
                setSwaps(swapsTmp);
            } else {
                if (setRefundTxId) {
                    setRefundTxId(res.refundTx);
                }
            }
        } catch (error) {
            log.debug("refund failed", error);
            setNotificationType("error");
            if (typeof error.json === "function") {
                error
                    .json()
                    .then((jsonError: any) => {
                        let msg = jsonError.error;
                        if (
                            msg === "bad-txns-inputs-missingorspent" ||
                            msg === "Transaction already in block chain" ||
                            msg.startsWith("insufficient fee")
                        ) {
                            msg = t("already_refunded");
                        } else if (
                            msg === "mandatory-script-verify-flag-failed"
                        ) {
                            msg = t("locktime_not_satisfied");
                        }
                        log.error(msg);
                        setNotification(msg);
                    })
                    .catch((genericError: any) => {
                        log.error(genericError);
                        setNotification(genericError);
                    });
            } else {
                log.error(error.message);
                setNotification(error.message);
            }
        }

        setRefundRunning(false);
    };

    return (
        <>
            <h3 style={"color: #fff"}>
                {swap()
                    ? t("refund_address_header", { asset: swap()?.asset })
                    : t("refund_address_header_no_asset")}
            </h3>
            <input
                data-testid="refundAddress"
                id="refundAddress"
                disabled={swap() === null}
                onInput={(e) => setValid(refundAddressChange(e, swap()?.asset))}
                type="text"
                name="refundAddress"
                placeholder={
                    swap()
                        ? t("onchain_address", { asset: swap()?.asset })
                        : t("onchain_address_no_asset")
                }
            />
            <button
                data-testid="refundButton"
                class="btn"
                disabled={!valid() || refundRunning()}
                onclick={() => refundAction()}>
                {t("refund")}
            </button>
        </>
    );
};

export default RefundButton;
