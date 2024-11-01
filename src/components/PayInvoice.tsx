import { BigNumber } from "bignumber.js";
import log from "loglevel";
import { Show } from "solid-js";

import CopyButton from "../components/CopyButton";
import QrCode from "../components/QrCode";
import { BTC } from "../consts/Assets";
import { Denomination } from "../consts/Enums";
import { useGlobalContext } from "../context/Global";
import { formatAmount } from "../utils/denomination";
import { clipboard, cropString, isMobile } from "../utils/helper";
import { invoicePrefix } from "../utils/invoice";
import { enableWebln } from "../utils/webln";

const PayInvoice = (props: { sendAmount: number; invoice: string }) => {
    const { t, denomination, separator, webln } = useGlobalContext();
    const payWeblnInvoice = async (pr: string) => {
        await enableWebln(async () => {
            const result = await window.webln.sendPayment(pr);
            log.debug("webln payment result:", result);
        });
    };

    return (
        <div>
            <h2 data-testid="pay-invoice-title">
                {t("pay_invoice_to", {
                    amount: formatAmount(
                        BigNumber(props.sendAmount),
                        denomination(),
                        separator(),
                    ),
                    denomination:
                        denomination() === Denomination.Sat ? "sats" : BTC,
                })}
            </h2>
            <hr />
            <a href={invoicePrefix + props.invoice}>
                <QrCode data={props.invoice} />
            </a>
            <hr />
            <p
                onClick={() => clipboard(props.invoice)}
                class="address-box break-word">
                {cropString(props.invoice)}
            </p>
            <hr />
            <Show when={isMobile()}>
                <h3>{t("warning_return")}</h3>
                <hr />
            </Show>
            <Show when={webln() && !isMobile()}>
                <span
                    class="btn btn-light"
                    onClick={() => payWeblnInvoice(props.invoice)}>
                    {t("pay_invoice_webln")}
                </span>
            </Show>
            <Show when={isMobile()}>
                <a href={invoicePrefix + props.invoice} class="btn btn-light">
                    {t("open_in_wallet")}
                </a>
            </Show>
            <hr class="spacer" />
            <CopyButton label="copy_invoice" data={props.invoice} />
        </div>
    );
};

export default PayInvoice;
