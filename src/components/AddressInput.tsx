import { Accessor, createEffect, on } from "solid-js";

import { RBTC } from "../consts";
import { useCreateContext } from "../context/Create";
import { useGlobalContext } from "../context/Global";
import { decodeAddress } from "../utils/address";
import { extractAddress } from "../utils/invoice";
import { setButtonLabel } from "./CreateButton";

const AddressInput = ({ allowEmpty }: { allowEmpty?: Accessor<boolean> }) => {
    let inputRef: HTMLInputElement;

    const { t } = useGlobalContext();
    const {
        asset,
        assetReceive,
        reverse,
        amountValid,
        onchainAddress,
        setAddressValid,
        setOnchainAddress,
    } = useCreateContext();

    const validateAddress = (input: HTMLInputElement) => {
        console.log("am validatin");

        const inputValue = input.value.trim();
        const address = extractAddress(inputValue);

        try {
            if (address == "" && allowEmpty()) {
                console.log("valid");
                setAddressValid(true);
            } else {
                const assetName = asset();
                decodeAddress(assetName, address);
                input.setCustomValidity("");
                input.classList.remove("invalid");
                setAddressValid(true);
                setOnchainAddress(address);
            }
        } catch (e) {
            const msg = t("invalid_address", { asset: asset() });
            setAddressValid(false);
            input.classList.add("invalid");
            input.setCustomValidity(msg);
            if (amountValid()) {
                setButtonLabel({
                    key: "invalid_address",
                    params: { asset: asset() },
                });
            }
        }
    };

    createEffect(
        on([amountValid, onchainAddress, assetReceive], () => {
            if (reverse() && asset() !== RBTC) {
                validateAddress(inputRef);
            }
        }),
    );

    return (
        <input
            ref={inputRef}
            required
            onInput={(e) => validateAddress(e.currentTarget)}
            onKeyUp={(e) => validateAddress(e.currentTarget)}
            onPaste={(e) => validateAddress(e.currentTarget)}
            type="text"
            id="onchainAddress"
            data-testid="onchainAddress"
            name="onchainAddress"
            autocomplete="off"
            placeholder={t("onchain_address", { asset: asset() })}
            value={onchainAddress()}
        />
    );
};

export default AddressInput;
