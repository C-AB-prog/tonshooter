import crypto from "node:crypto";
/**
 * Verifies Telegram WebApp initData.
 * Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash)
        return { ok: false };
    const pairs = [];
    params.forEach((value, key) => {
        if (key === "hash")
            return;
        pairs.push(`${key}=${value}`);
    });
    pairs.sort(); // sort by key
    const dataCheckString = pairs.join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (!timingSafeEqualHex(computedHash, hash))
        return { ok: false };
    const out = {};
    params.forEach((value, key) => (out[key] = value));
    return { ok: true, data: out };
}
function timingSafeEqualHex(a, b) {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length)
        return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}
export function parseTelegramUser(initData) {
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson)
        return null;
    try {
        const u = JSON.parse(userJson);
        return u;
    }
    catch {
        return null;
    }
}
export function parseStartParam(initData) {
    const params = new URLSearchParams(initData);
    return params.get("start_param");
}
