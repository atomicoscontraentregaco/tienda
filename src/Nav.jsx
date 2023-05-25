import { A } from "@solidjs/router";

import { useI18n } from "@solid-primitives/i18n";
import {
    online,
    i18n,
    setI18n,
    hamburger,
    setHamburger,
    wasmSupported,
} from "./signals";
import { network } from "./config";
import { fetchPairs } from "./helper";

import "./css/nav.css";
import logo from "./assets/boltz.svg";
import reload_svg from "./assets/reload.svg";

const locales = {
    en: "English",
    de: "Deutsch",
    es: "Español",
    jp: "Japanese",
};

const Nav = () => {
    const [t, { locale }] = useI18n();

    const set_local = (locale_code) => {
        locale(locale_code);
        setI18n(locale_code);
    };

    return (
        <nav>
            <div class="nav-inner">
                <svg
                    id="hamburger"
                    viewBox="0 0 100 100"
                    width="50"
                    class={hamburger() ? "active" : ""}
                    onClick={() => setHamburger(!hamburger())}>
                    <path
                        class="line top"
                        d="m 70,33 h -40 c 0,0 -8.5,-0.149796 -8.5,8.5 0,8.649796 8.5,8.5 8.5,8.5 h 20 v -20"
                    />
                    <path class="line middle" d="m 70,50 h -40" />
                    <path
                        class="line bottom"
                        d="m 30,67 h 40 c 0,0 8.5,0.149796 8.5,-8.5 0,-8.649796 -8.5,-8.5 -8.5,-8.5 h -20 v 20"
                    />
                </svg>

                <A id="logo" href="/">
                    <img src={logo} alt="boltz.exchange btc logo" />
                </A>
                <div id="network" class="btn btn-small">
                    {network === "main" ? "Liquid" : network}
                </div>

                <div id="collapse" class={hamburger() ? "active" : ""}>
                    <A href="/swap" onClick={() => setHamburger(false)}>
                        {t("swap")}
                    </A>
                    <A href="/refund" onClick={() => setHamburger(false)}>
                        {t("refund")}
                    </A>
                    <A href="/history" onClick={() => setHamburger(false)}>
                        {t("history")}
                    </A>
                    <a
                        class="external"
                        target="_blank"
                        href="https://docs.boltz.exchange/en/latest/">
                        {t("documentation")}
                    </a>
                    <a
                        class="external"
                        target="_blank"
                        href="https://discord.gg/QBvZGcW">
                        {t("help")}
                    </a>
                    <a
                        class="external"
                        target="_blank"
                        href="http://boltzzzbnus4m7mta3cxmflnps4fp7dueu2tgurstbvrbt6xswzcocyd.onion/">
                        {t("onion")}
                    </a>
                </div>
                <Show when={false}>
                    <div id="languages">
                        <span>{locales[i18n()]}</span>
                        <div class="dropdown">
                            <span class="lang" onClick={() => set_local("en")}>
                                {locales["en"]}
                            </span>
                            <span class="lang" onClick={() => set_local("de")}>
                                {locales["de"]}
                            </span>
                            <span class="lang" onClick={() => set_local("es")}>
                                {locales["es"]}
                            </span>
                            <span class="lang" onClick={() => set_local("jp")}>
                                {locales["jp"]}
                            </span>
                        </div>
                    </div>
                </Show>
            </div>
            <Show when={!online()}>
                <div id="offline">
                    {t("api_offline")}
                    <span class="icon-reload" onClick={fetchPairs}>
                        <img src={reload_svg} />
                    </span>
                </div>
            </Show>
            <Show when={!wasmSupported()}>
                <div id="noWasm">{t("wasm_not_supported")}</div>
            </Show>
        </nav>
    );
};

export default Nav;
