import log from 'loglevel';
import { createSignal, createEffect } from "solid-js";
import { render } from "solid-js/web";
import { refundAddress, setRefundAddress, upload, setUpload, swaps, setSwaps } from "./signals";
import { downloadBackup, refund } from "./helper";

const [error, setError] = createSignal("no file seleced");
const [refundJson, setRefundJson] = createSignal(null);
import { useParams, useNavigate } from "@solidjs/router";
import { useI18n } from "@solid-primitives/i18n";

import "./refund.css";

createEffect(() => {
  new Response(upload()).json().then(
    (json) => {
      if (json === 0) return;
      setRefundJson(json);
    },
    (err) => {
      setRefundJson(null);
      setError("not a json file");
    }
  );
});

createEffect(() => {
  if (refundAddress() === null) return setError("no refund address");
  if (refundJson() === null) return setError("no json file");
  setError(false);
});

const refundAddressChange = (e) => {
  let t = e.currentTarget;
  if (t.value.trim()) {
    setRefundAddress(t.value.trim());
  } else {
    setRefundAddress(null);
  }
};

const Refund = () => {

  const navigate = useNavigate();
  const [t, { add, locale, dict }] = useI18n();

  const printDate = (d) => {
    let date = new Date();
    date.setTime(d);
    return date.toLocaleDateString();
  };

  const deleteLocalstorage = () => {
      if(confirm(t("delete_localstorage"))) {
          setSwaps("[]")
      }
  };


  const delete_swap = (swap_id) => {
      if(confirm(t("delete_localstorage"))) {
          let tmp_swaps = JSON.parse(swaps());
          if (tmp_swaps) {
              let new_swaps = tmp_swaps.filter(s => s.id !== swap_id);
              setSwaps(JSON.stringify(new_swaps));
          }
      }
  };


  return (
    <div id="refund">
        <div class="frame">
          <h2>{t("refund_a_swap")}</h2>
          <p>{t("refund_a_swap_subline")}</p>
          <hr />
          <input
            onKeyUp={refundAddressChange}
            onChange={refundAddressChange}
            type="text"
            id="refundAddress"
            name="refundAddress"
            placeholder={t("refund_address_placeholder")}
          />
          <input
            type="file"
            id="refundUpload"
            onChange={(e) => setUpload(e.currentTarget.files[0])}
          />
          <div class={error() === false ? "hidden" : ""}>
            <span class="error">{error()}</span>
          </div>
          <div class={error() !== false ? "hidden" : ""}>
            <span class="btn btn-success" onClick={() => refund(refundJson())}>
              refund
            </span>
          </div>
        </div>
    </div>
  );
};

export default Refund;
