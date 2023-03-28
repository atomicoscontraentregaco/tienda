import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { useI18n } from "@solid-primitives/i18n";
import { fetcher, lnurl_fetcher, qr, btc_divider, startInterval, focus } from "./helper";
import { useNavigate } from "@solidjs/router";

import * as secp from '@noble/secp256k1';

import btc_svg from "./assets/btc.svg";
import sat_svg from "./assets/sat.svg";
import bitcoin_svg from "./assets/bitcoin-icon.svg";
import liquid_svg from "./assets/liquid-icon.svg";
import reload_svg from "./assets/reload.svg";
import arrow_svg from "./assets/arrow.svg";

import {
  setSwap,
  swaps,
  setSwaps,
  assetSelect,
  setAssetSelect,
  asset,
  setAsset,
  denomination,
  setDenomination,
  boltzFee,
  setBoltzFee,
  sendAmount,
  setSendAmount,
  minerFee,
  setMinerFee,
  minimum,
  setMinimum,
  maximum,
  setMaximum,
  receiveAmount,
  setReceiveAmount,
  reverse,
  setReverse,
  config,
  setConfig,
  valid,
  setValid,
  amountValid,
  setAmountValid,
  swapValid,
  setSwapValid,
  invoice,
  setInvoice,
  onchainAddress,
  setOnchainAddress,
  setNotification,
  setNotificationType,
  webln,
} from "./signals";

let lnurl = "LNURL1DP68GURN8GHJ7MR9VAJKUEPWD3HXY6T5WVHXXMMD9AKXUATJD3CZ7D3S8QUQLFF2GW";
// let lnurl = "dni@600.wtf";

lnurl_fetcher(lnurl, 10000, (invoice) => {
    console.log("invoice", invoice);
});
const Create = () => {

  // set fees and pairs
  createEffect(() => {
    let cfg = config();
    let denom = denomination();
    if (cfg) {
      let divider = (denom == "btc") ? btc_divider : 1;
      setMinimum(cfg.limits.minimal / divider);
      setMaximum(cfg.limits.maximal / divider);
      setBoltzFee(cfg.fees.percentage);
      if (reverse()) {
        let rev = cfg.fees.minerFees.baseAsset.reverse;
        let fee = rev.claim + rev.lockup;
        if (denom == "btc") {
            fee = (fee / btc_divider).toFixed(8);
        }
        setMinerFee(fee);
      } else {
        let fee = cfg.fees.minerFees.baseAsset.normal;
        if (denom == "btc") {
            fee = (fee / btc_divider).toFixed(8);
        }
        setMinerFee(fee);
      }
    }
  });

  // reset send amount when changing denomination
  createEffect(() => {
    let send_amount = 100000;
    if (denomination() == "btc") {
        send_amount = 0.001;
    }
    setSendAmount(send_amount)
    setReceiveAmount(calculateReceiveAmount(send_amount))
  });

  // validation swap
  createEffect(() => {
      if (!reverse() && invoice() || reverse() && onchainAddress()) {
        setSwapValid(true);
      } else {
        setSwapValid(false);
      }
  });

  // validation amount
  // createEffect(() => {
  //     // think about validation again
  //     let send_amount = sendAmount();
  //     let target = document.getElementById("sendAmount");
  //     target.checkValidity();
  //     setAmountValid(true);
  //     for (let k in target.validity) {
  //       if (k === "valid") continue;
  //       if (target.validity[k]) {
  //         // setReceiveAmount(k);
  //         setAmountValid(false);
  //         break;
  //       }
  //    };
  // });

  // validation form
  // createEffect(() => {
  //     let create_btn = document.getElementById("create-swap");
  //     if (amountValid() && swapValid()) {
  //       setValid(true);
  //       create_btn.disabled = false;
  //     } else {
  //       setValid(false);
  //       create_btn.disabled = true;
  //     }
  // });

  const [t, { add, locale, dict }] = useI18n();

  const navigate = useNavigate();

  const fetchPairs = () => {
    fetcher("/getpairs", (data) => {
        let cfg = data.pairs["BTC/BTC"];
        setConfig(cfg);
        setNotificationType("success");
        setNotification("successfully updated fees!");
    });
    return false;
  };

  const formatAmount = (amount) => {
    if (denomination() == "btc") {
        amount = amount.toFixed(8);
    }
    if (denomination() == "sat") {
        amount = Math.ceil(amount);
    }
    return amount;
  };

  const calculateReceiveAmount = (amount) => {
    amount = amount - minerFee() - (amount * boltzFee()) / 100;
    return formatAmount(amount);
  };

  const calculateSendAmount = (amount) => {
    amount = parseFloat(amount) + parseFloat(minerFee()) + (amount * boltzFee()) / 100;
    return formatAmount(amount);
  };

  const changeReceiveAmount = (amount) => {
    setReceiveAmount(amount);
    setSendAmount(calculateSendAmount(amount));
  };

  const changeSendAmount = (amount) => {
    setSendAmount(amount);
    setReceiveAmount(calculateReceiveAmount(amount));
  };

  const changeAsset = (asset) => {
    setAsset(asset);
    setAssetSelect(false);
  };

  const createWeblnInvoice = async () => {
      let check_enable = await window.webln.enable();
      if (check_enable.enabled) {
          let amount = sendAmount();
          if (denomination() == "btc") {
              amount = amount * 100000000;
          }
          const invoice = await window.webln.makeInvoice({ amount: amount });
          setInvoice(invoice.paymentRequest);
      }
  };

  const create = async () => {
      if (valid()) {
          const privateKey = secp.utils.randomPrivateKey();
          const privateKeyHex = secp.utils.bytesToHex(privateKey);
          const publicKey = secp.getPublicKey(privateKey);
          const publicKeyHex = secp.utils.bytesToHex(publicKey);
          let params = null;
          let preimageHex = null;

          // TODO: not hardcode asset
          if (reverse()) {
              const preimage = secp.utils.randomBytes(32);
              preimageHex = secp.utils.bytesToHex(preimage);
              let preimageHash = await secp.utils.sha256(preimage);
              let preimageHashHex = secp.utils.bytesToHex(preimageHash);
              params = {
                  "type": "reversesubmarine",
                  "pairId": "BTC/BTC",
                  "orderSide": "buy",
                  "invoiceAmount": sendAmount(),
                  "claimPublicKey": publicKeyHex,
                  "preimageHash": preimageHashHex
              };
          } else {
              params = {
                  "type": "submarine",
                  "pairId": "BTC/BTC",
                  "orderSide": "sell",
                  "refundPublicKey": publicKeyHex,
                  "invoice": invoice()
              };
          }
          fetcher("/createswap", (data) => {
              data.privateKey = privateKeyHex;
              data.date = (new Date()).getTime();
              data.reverse = reverse();
              data.asset = asset();
              data.preimage = preimageHex;
              data.onchainAddress = onchainAddress();
              setSwap(data);
              let tmp_swaps = JSON.parse(swaps());
              tmp_swaps.push(data)
              setSwaps(JSON.stringify(tmp_swaps));
              navigate("/swap/" + data.id);
          }, params);
      };
  };


  fetchPairs();

  return (
    <div class="frame" data-reverse={reverse()} data-asset={asset()}>
      <h2>{t("create_swap")}</h2>
      <p>{t("create_swap_subline")}</p>
      <hr />
      <div class="icons">
        <div>
          <div className="asset-wrap" onClick={() => setAssetSelect(!assetSelect())}>
              <div className="asset asset-1">
                  <div className="asset-selected">
                      <span class="icon-1 icon"></span>
                      <span class="asset-text"></span>
                      <span class="arrow-down"></span>
                  </div>
              </div>
          </div>
          <input autofocus required type="number" id="sendAmount" maxlength="10"
            step={denomination() == "btc" ? 0.00000001 : 1 }
            min={minimum()}
            max={maximum()}
            value={sendAmount()}
            onChange={(e) => changeSendAmount(e.currentTarget.value)}
            onKeyUp={(e) => changeSendAmount(e.currentTarget.value)}
          />
        </div>
        <div id="flip-assets" onClick={(e) => { setReverse(!reverse()); focus(); }}>
            <img src={arrow_svg} alt="flip assets" />
        </div>
        <div>
          <div className="asset-wrap" onClick={() => setAssetSelect(!assetSelect())}>
              <div className="asset asset-2">
                  <div className="asset-selected">
                      <span class="icon-2 icon"></span>
                      <span class="asset-text"></span>
                      <span class="arrow-down"></span>
                  </div>
              </div>
              <div class="assets-select">
              </div>
          </div>
          <input autofocus required type="number" id="receiveAmount" maxlength="10"
            step={denomination() == "btc" ? 0.00000001 : 1 }
            min={minimum()}
            max={maximum()}
            value={receiveAmount()}
            onChange={(e) => changeReceiveAmount(e.currentTarget.value)}
            onKeyUp={(e) => changeReceiveAmount(e.currentTarget.value)}
          />
        </div>
      </div>
      <div class="fees-dyn">
        <div class="denomination">
            <label>{t("denomination")}: </label>
            <img src={btc_svg} onClick={() => setDenomination("btc")} class={denomination() == "btc" ? "active" : ""} alt="denominator" />
            <img src={sat_svg} onClick={() => setDenomination("sat")} class={denomination() == "sat" ? "active" : ""} alt="denominator" />
        </div>
        <label>
            <span class="icon-reload" onClick={fetchPairs}><img src={reload_svg} /></span>
            {t("network_fee")}: <span class="network-fee">{minerFee()} <span class="denominator" data-denominator={denomination()}></span></span><br />
            {t("fee")} ({boltzFee()}%): <span class="boltz-fee">{denomination() == "btc" ? ((sendAmount() * boltzFee()) / 100).toFixed(8) : Math.ceil((sendAmount() * boltzFee()) / 100)} <span class="denominator" data-denominator={denomination()}></span></span>
        </label>
      </div>
      <hr />
      <textarea
        onChange={(e) => setInvoice(e.currentTarget.value)}
        onKeyUp={(e) => setInvoice(e.currentTarget.value)}
        id="invoice"
        name="invoice"
        value={invoice()}
        placeholder={t("create_and_paste", { amount: receiveAmount(), denomination: denomination()})}
      ></textarea>
      <input
        onChange={(e) => setOnchainAddress(e.currentTarget.value)}
        onKeyUp={(e) => setOnchainAddress(e.currentTarget.value)}
        type="text"
        id="onchainAddress"
        name="onchainAddress"
        placeholder="On-chain address"
      />
      <Show when={webln()}>
          or&nbsp;
          <button onClick={(e) => createWeblnInvoice()}>Use WebLN to create the invoice</button>
      </Show>
      <hr />
      <div class="fees">
        <div class="fee">
          <span>
            <b>{minimum()}</b>
            <span class="denominator" data-denominator={denomination()}></span>
          </span>
          <br />
          <label>{t("min")}</label>
        </div>
        <div class="fee">
          <span>
            <b>{maximum()}</b>
            <span class="denominator" data-denominator={denomination()}></span>
          </span>
          <br />
          <label>{t("max")}</label>
        </div>
        <div class="fee">
          <span>
            <b>{boltzFee()} %</b>
          </span>
          <br />
          <label>{t("fee")}</label>
        </div>
      </div>
      <hr />
      <button id="create-swap" class="btn" onClick={create}>{t("create_swap")}</button>
      <div class="frame assets-select" style={assetSelect() ? "display: block;" : "display: none;"}>
          <h2>Select Asset</h2>
          <svg id="close" viewBox="0 0 100 100" width="50" onClick={() => setAssetSelect(!assetSelect())}>
              <path class="line top" d="m 70,33 h -40 c 0,0 -8.5,-0.149796 -8.5,8.5 0,8.649796 8.5,8.5 8.5,8.5 h 20 v -20" />
              <path class="line bottom" d="m 30,67 h 40 c 0,0 8.5,0.149796 8.5,-8.5 0,-8.649796 -8.5,-8.5 -8.5,-8.5 h -20 v 20" />
          </svg>
          <hr />
          <div className="asset-select" onClick={() => changeAsset("btc")}>
              <img src={bitcoin_svg} alt="bitcoin" />
              <span>bitcoin</span>
          </div>
          <div className="asset-select" onClick={() => changeAsset("l-btc")}>
              <img src={liquid_svg} alt="liquid bitcoin" />
              <span>liquid</span>
          </div>
      </div>
    </div>
  );
};

export default Create;
