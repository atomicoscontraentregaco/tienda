import type Transport from "@ledgerhq/hw-transport";
import { LoadType } from "./Loader";

export const load = async () => {
    const [eth, webhid] = await Promise.all([
        import("@ledgerhq/hw-app-eth"),
        import("@ledgerhq/hw-transport-webhid"),
    ]);

    return {
        eth: eth.default,
        webhid: webhid.default,
    };
}

export type LedgerModules = LoadType<typeof load>;

export { Transport };
