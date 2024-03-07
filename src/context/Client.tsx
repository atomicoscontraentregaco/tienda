import { useNavigate } from "@solidjs/router";
import { CreateQueryResult, createQuery } from "@tanstack/solid-query";
import {
    Accessor,
    Setter,
    createContext,
    createEffect,
    createSignal,
    lazy,
    useContext,
} from "solid-js";

import { BTC, LBTC } from "../consts";
import { Model, client, fetchInfo } from "../utils/client/api";
import { getPairs } from "../utils/helper";
import { useCreateContext } from "./Create";
import { useGlobalContext } from "./Global";

export type ClientContextType = {
    wallets: CreateQueryResult<Model<"Wallet">[]>;
    info: CreateQueryResult<any>;
    acceptZeroConf: Accessor<boolean>;
    setAcceptZeroConf: Setter<boolean>;
    autoSend: Accessor<boolean>;
    setAutoSend: Setter<boolean>;
};

type Currency = "BTC" | "LBTC";

const ClientContext = createContext<ClientContextType>();

export const assetToCurrency = (asset: string): Currency =>
    asset == LBTC ? "LBTC" : "BTC";

export const currencyToAsset = (currency: Currency): string =>
    currency == "LBTC" ? LBTC : currency;

const ClientProvider = (props: { children: any }) => {
    const [acceptZeroConf, setAcceptZeroConf] = createSignal(false);
    const [autoSend, setAutoSend] = createSignal(true);

    const { setHideHero, setBackend, setOnline, notify } = useGlobalContext();
    setHideHero(true);

    const { sendAmount, onchainAddress, invoice, asset, reverse } =
        useCreateContext();

    const navigate = useNavigate();

    const createSwap = async () => {
        let id = "";
        if (reverse()) {
            const data = await client()["/v1/createreverseswap"].post({
                json: {
                    amount: sendAmount().toString(),
                    acceptZeroConf: acceptZeroConf(),
                    pair: {
                        from: BTC,
                        to: assetToCurrency(asset()),
                    },
                    address: onchainAddress(),
                },
            });
            if (data.ok) {
                id = (await data.json()).id;
            } else {
                notify("error", "Failed to create swap");
            }
        } else {
            const data = await client()["/v1/createswap"].post({
                json: {
                    amount: sendAmount().toString(),
                    autoSend: autoSend(),
                    pair: {
                        from: assetToCurrency(asset()),
                        to: BTC,
                    },
                    invoice: invoice(),
                },
            });
            if (data.ok) {
                id = (await data.json()).id;
            } else {
                notify("error", "Failed to create swap");
            }
        }

        navigate("/swap/" + id);
    };

    setBackend({
        availableAssets: () => [BTC, "LIQUID"],
        createSwap,
        fetchPairs: getPairs,
        SwapStatusPage: lazy(() => import("../pages/ClientPay")),
        SwapHistory: lazy(() => import("../components/ClientHistory")),
    });

    const wallets = createQuery(() => ({
        queryKey: ["wallets"],
        queryFn: async () => {
            console.log("wtf..");
            const response = await client()["/v1/wallets"].get();
            if (response.ok) {
                console.log("wallets!");
                const data = await response.json();
                return data.wallets;
            }
            console.log(response);
            throw new Error("Failed to fetch wallets");
        },
    }));

    const info = createQuery(() => ({
        queryKey: ["info"],
        queryFn: fetchInfo,
    }));
    createEffect(() => {
        console.log(info.data);
        if (info.isError) {
            //setOnline(false);
        }
        if (info.isSuccess) {
            setOnline(true);
        }
    });
    return (
        <ClientContext.Provider
            value={{
                wallets,
                info,
                acceptZeroConf,
                setAcceptZeroConf,
                autoSend,
                setAutoSend,
            }}>
            {props.children}
        </ClientContext.Provider>
    );
};

const useClientContext = () => {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error("useClientContext: cannot find a ClientContext");
    }
    return context;
};

export { useClientContext, ClientProvider };
