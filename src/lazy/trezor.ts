import type { Address, Unsuccessful } from "@trezor/connect-web";
import type {
    Response,
    SuccessWithDevice,
} from "@trezor/connect/lib/types/params";
import { LoadType } from "./Loader";

export const load = async () => {
    return (await import("@trezor/connect-web")).default;
}

export type TrezorConnect = LoadType<typeof load>;

export { Address, Unsuccessful, Response, SuccessWithDevice };
