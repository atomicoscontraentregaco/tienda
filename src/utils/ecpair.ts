import ecc from "@bitcoinerlab/secp256k1";
import { initEccLib } from "bitcoinjs-lib";
import { ECPairFactory, ECPairInterface } from "ecpair";
import { Buffer } from "buffer";

initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export const parseBlindingKey = (swap: { blindingKey: string | undefined }) => {
    return swap.blindingKey ? Buffer.from(swap.blindingKey, "hex") : undefined;
};

export const parsePrivateKey = (privateKey: string): ECPairInterface => {
    try {
        return ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"));
    } catch (e) {
        // When the private key is not HEX, we try to decode it as WIF
        return ECPair.fromWIF(privateKey);
    }
};

export { ECPair, ecc };
