import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { Match, Show, Switch } from "solid-js";

import { currencyToAsset } from "../context/Client";
import { useGlobalContext } from "../context/Global";
import { client } from "../utils/client/api";
import SwapList, { SwapInfo } from "./SwapList";

const ClientHistory = () => {
    const navigate = useNavigate();

    const { t } = useGlobalContext();

    const query = createQuery(() => ({
        queryKey: ["swaps"],
        queryFn: async () => {
            const response = await client()["/v1/listswaps"].get();

            if (response.ok) {
                const data = await response.json();
                const transform = (swap: any, reverse: boolean): SwapInfo => {
                    return {
                        id: swap.id,
                        asset: currencyToAsset(
                            reverse ? swap.pair.to : swap.pair.from,
                        ),
                        reverse,
                        date: swap.createdAt * 1000,
                    };
                };

                const swaps = data.swaps
                    .map((swap) => transform(swap, false))
                    .concat(
                        ...data.reverseSwaps.map((swap) =>
                            transform(swap, true),
                        ),
                    );

                console.log(swaps);
                return swaps;
            }
            return [];
        },
    }));

    return (
        <div id="history">
            <div class="frame">
                <h2>{t("refund_past_swaps")}</h2>
                <hr />
                <Switch>
                    <Match when={query.isSuccess}>
                        <Show
                            when={query.data.length > 0}
                            fallback={
                                <div>
                                    <p>{t("history_no_swaps")}</p>
                                    <button
                                        class="btn"
                                        onClick={() => navigate("/swap")}>
                                        {t("new_swap")}
                                    </button>
                                </div>
                            }>
                            <SwapList swapsSignal={() => query.data} />
                            <hr />
                        </Show>
                    </Match>
                </Switch>
            </div>
        </div>
    );
};
export default ClientHistory;
