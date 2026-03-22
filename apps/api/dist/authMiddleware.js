import { verifyJwt } from "./jwt.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? "";
    const [, token] = header.split(" ");
    if (!token)
        return res.status(401).json({ error: "unauthorized" });
    try {
        const p = verifyJwt(token);
        req.auth = { uid: p.uid, tgUserId: BigInt(p.tg) };
        return next();
    }
    catch {
        return res.status(401).json({ error: "unauthorized" });
    }
}
