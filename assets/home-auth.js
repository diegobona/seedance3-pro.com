//#region node_modules/better-auth/dist/client/broadcast-channel.mjs
var e = Symbol.for("better-auth:broadcast-channel"), t = () => Math.floor(Date.now() / 1e3), n = class {
	listeners = /* @__PURE__ */ new Set();
	name;
	constructor(e = "better-auth.message") {
		this.name = e;
	}
	subscribe(e) {
		return this.listeners.add(e), () => {
			this.listeners.delete(e);
		};
	}
	post(e) {
		if (typeof window < "u") try {
			localStorage.setItem(this.name, JSON.stringify({
				...e,
				timestamp: t()
			}));
		} catch {}
	}
	setup() {
		if (typeof window > "u" || window.addEventListener === void 0) return () => {};
		let e = (e) => {
			if (e.key !== this.name) return;
			let t = JSON.parse(e.newValue ?? "{}");
			t?.event === "session" && t?.data && this.listeners.forEach((e) => e(t));
		};
		return window.addEventListener("storage", e), () => {
			window.removeEventListener("storage", e);
		};
	}
};
function r(t = "better-auth.message") {
	return globalThis[e] || (globalThis[e] = new n(t)), globalThis[e];
}
//#endregion
//#region node_modules/nanostores/atom/index.js
var i = [], a = 0, o = null, s = 4, c = globalThis.nanostoresGlobal ||= { epoch: 0 }, l = () => {
	let e, t;
	for (; a < i.length;) {
		t = a, a += s;
		try {
			i[t](i[t + 1].value, i[t + 2], i[t + 3]);
		} catch (t) {
			e = t;
		}
	}
	if (i.length = a = 0, e) throw e;
}, u = /* @__NO_SIDE_EFFECTS__ */ (e) => {
	let t = [], n = {
		eq: Object.is,
		get() {
			return n.lc || n.listen(() => {})(), n.value;
		},
		init: e,
		lc: 0,
		listen(e) {
			return n.lc = t.push(e), () => {
				for (let t = a; t < i.length;) i[t] === e ? i.splice(t, s) : t += s;
				let r = t.indexOf(e);
				~r && (t.splice(r, 1), --n.lc || n.off());
			};
		},
		notify(e, r) {
			c.epoch++;
			let a = !i.length && !0;
			for (let a of t) o?.has(a) || (o?.add(a), i.push(a, n, e, r));
			a && l();
		},
		off() {},
		set(e) {
			let t = n.value;
			n.eq(t, e) || (n.value = e, n.notify(t));
		},
		subscribe(e) {
			let t = n.listen(e);
			return e(n.value), t;
		},
		value: e
	};
	return n;
}, d = 2, f = 5, p = 6, m = 10, h = (e, t, n, r) => (e.events = e.events || {}, e.events[n + m] || (e.events[n + m] = r((t) => {
	e.events[n].reduceRight((e, t) => (t(e), e), {
		shared: {},
		...t
	});
})), e.events[n] = e.events[n] || [], e.events[n].push(t), () => {
	let r = e.events[n], i = r.indexOf(t);
	~i && (r.splice(i, 1), r.length || (e.events[n + m](), delete e.events[n + m]));
}), g = (e, t) => h(e, t, d, (t) => {
	let n = e.set, r = e.setKey;
	return e.setKey &&= (n, i) => {
		let a;
		if (t({
			abort: () => {
				a = !0;
			},
			changed: n,
			newValue: {
				...e.value,
				[n]: i
			}
		}), !a) return r(n, i);
	}, e.set = (e) => {
		let r;
		if (t({
			abort: () => {
				r = !0;
			},
			newValue: e
		}), !r) return n(e);
	}, () => {
		e.set = n, e.setKey = r;
	};
}), _ = 1e3, v = (e, t) => h(e, (n) => {
	let r = t(n);
	r && e.events[p].push(r);
}, f, (t) => {
	let n = e.listen;
	e.listen = (...r) => (!e.lc && !e.active && (e.active = !0, t()), n(...r));
	let r = e.off;
	return e.events[p] = [], e.off = () => {
		r(), setTimeout(() => {
			if (e.active && !e.lc) {
				e.active = !1;
				for (let t of e.events[p]) t();
				e.events[p] = [];
			}
		}, _);
	}, () => {
		e.listen = n, e.off = r;
	};
});
//#endregion
//#region node_modules/better-auth/dist/client/equality.mjs
function y(e) {
	if (typeof e != "object" || !e) return !1;
	let t = Object.getPrototypeOf(e);
	return t === Object.prototype || t === null;
}
function b(e, t) {
	if (e === t) return !0;
	if (Array.isArray(e) && Array.isArray(t)) {
		if (e.length !== t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!b(e[n], t[n])) return !1;
		return !0;
	}
	if (y(e) && y(t)) {
		let n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (let r of n) if (!(r in t) || !b(e[r], t[r])) return !1;
		return !0;
	}
	return !1;
}
function x(e, t) {
	return g(e, ({ newValue: n, abort: r }) => {
		t(e.value, n) && r();
	});
}
//#endregion
//#region node_modules/better-auth/dist/client/focus-manager.mjs
var S = Symbol.for("better-auth:focus-manager"), C = class {
	listeners = /* @__PURE__ */ new Set();
	subscribe(e) {
		return this.listeners.add(e), () => {
			this.listeners.delete(e);
		};
	}
	setFocused(e) {
		this.listeners.forEach((t) => t(e));
	}
	setup() {
		if (typeof window > "u" || typeof document > "u" || window.addEventListener === void 0) return () => {};
		let e = () => {
			document.visibilityState === "visible" && this.setFocused(!0);
		};
		return document.addEventListener("visibilitychange", e, !1), () => {
			document.removeEventListener("visibilitychange", e, !1);
		};
	}
};
function w() {
	return globalThis[S] || (globalThis[S] = new C()), globalThis[S];
}
//#endregion
//#region node_modules/better-auth/dist/client/online-manager.mjs
var T = Symbol.for("better-auth:online-manager"), E = class {
	listeners = /* @__PURE__ */ new Set();
	isOnline = typeof navigator < "u" ? navigator.onLine : !0;
	subscribe(e) {
		return this.listeners.add(e), () => {
			this.listeners.delete(e);
		};
	}
	setOnline(e) {
		this.isOnline = e, this.listeners.forEach((t) => t(e));
	}
	setup() {
		if (typeof window > "u" || window.addEventListener === void 0) return () => {};
		let e = () => this.setOnline(!0), t = () => this.setOnline(!1);
		return window.addEventListener("online", e, !1), window.addEventListener("offline", t, !1), () => {
			window.removeEventListener("online", e, !1), window.removeEventListener("offline", t, !1);
		};
	}
};
function D() {
	return globalThis[T] || (globalThis[T] = new E()), globalThis[T];
}
//#endregion
//#region node_modules/better-auth/dist/client/parser.mjs
var O = {
	proto: /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/,
	constructor: /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/,
	protoShort: /"__proto__"\s*:/,
	constructorShort: /"constructor"\s*:/
}, k = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/, A = {
	true: !0,
	false: !1,
	null: null,
	undefined: void 0,
	nan: NaN,
	infinity: Infinity,
	"-infinity": -Infinity
}, ee = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(?:Z|([+-])(\d{2}):(\d{2}))$/;
function j(e) {
	return e instanceof Date && !isNaN(e.getTime());
}
function te(e) {
	let t = ee.exec(e);
	if (!t) return null;
	let [, n, r, i, a, o, s, c, l, u, d] = t, f = new Date(Date.UTC(parseInt(n, 10), parseInt(r, 10) - 1, parseInt(i, 10), parseInt(a, 10), parseInt(o, 10), parseInt(s, 10), c ? parseInt(c.padEnd(3, "0"), 10) : 0));
	if (l) {
		let e = (parseInt(u, 10) * 60 + parseInt(d, 10)) * (l === "+" ? -1 : 1);
		f.setUTCMinutes(f.getUTCMinutes() + e);
	}
	return j(f) ? f : null;
}
function M(e, t = {}) {
	let { strict: n = !1, warnings: r = !1, reviver: i, parseDates: a = !0 } = t;
	if (typeof e != "string") return e;
	let o = e.trim(), s = o.toLowerCase();
	if (s.length <= 9 && s in A) return A[s];
	if (!k.test(o)) {
		if (n) throw SyntaxError("[better-json] Invalid JSON");
		return e;
	}
	if (Object.entries(O).some(([e, t]) => {
		let n = t.test(o);
		return n && r && console.warn(`[better-json] Detected potential prototype pollution attempt using ${e} pattern`), n;
	}) && n) throw Error("[better-json] Potential prototype pollution attempt detected");
	try {
		return JSON.parse(o, (e, t) => {
			if (e === "__proto__" || e === "constructor" && t && typeof t == "object" && "prototype" in t) {
				r && console.warn(`[better-json] Dropping "${e}" key to prevent prototype pollution`);
				return;
			}
			if (a && typeof t == "string") {
				let e = te(t);
				if (e) return e;
			}
			return i ? i(e, t) : t;
		});
	} catch (t) {
		if (n) throw t;
		return e;
	}
}
function N(e, t = { strict: !0 }) {
	return M(e, t);
}
//#endregion
//#region node_modules/better-auth/dist/client/session-refresh.mjs
var P = () => Math.floor(Date.now() / 1e3), F = 5;
function I(e) {
	let { fetchSession: t, shouldPollSession: n = () => !0, sessionSignal: i, options: a = {} } = e, o = a.sessionOptions?.refetchInterval ?? 0, s = a.sessionOptions?.refetchOnWindowFocus ?? !0, c = a.sessionOptions?.refetchWhenOffline ?? !1, l = {
		isInitialized: !1,
		lastSessionRequest: 0
	}, u = () => c || D().isOnline, d = (e) => {
		if (u()) {
			if (e?.event === "storage") {
				t();
				return;
			}
			if (e?.event === "poll") {
				l.lastSessionRequest = P(), t();
				return;
			}
			if (e?.event === "visibilitychange") {
				if (P() - l.lastSessionRequest < F) return;
				l.lastSessionRequest = P(), t();
				return;
			}
			t();
		}
	}, f = (e) => {
		r().post({
			event: "session",
			data: { trigger: e },
			clientId: Math.random().toString(36).substring(7)
		});
	}, p = () => {
		o && o > 0 && (l.pollInterval = setInterval(() => {
			n() && d({ event: "poll" });
		}, o * 1e3));
	}, m = () => {
		l.unsubscribeBroadcast = r().subscribe(() => {
			d({ event: "storage" });
		});
	}, h = () => {
		s && (l.unsubscribeFocus = w().subscribe(() => {
			d({ event: "visibilitychange" });
		}));
	}, g = () => {
		l.unsubscribeOnline = D().subscribe((e) => {
			e && d({ event: "visibilitychange" });
		});
	}, _ = () => {
		l.unsubscribeSignal = i.listen(() => {
			t();
		});
	};
	return {
		init: () => {
			l.isInitialized || (l.isInitialized = !0, p(), m(), h(), g(), _(), l.cleanupBroadcastSetup = r().setup(), l.cleanupFocusSetup = w().setup(), l.cleanupOnlineSetup = D().setup());
		},
		cleanup: () => {
			l.isInitialized && (l.pollInterval &&= (clearInterval(l.pollInterval), void 0), l.unsubscribeBroadcast &&= (l.unsubscribeBroadcast(), void 0), l.unsubscribeFocus &&= (l.unsubscribeFocus(), void 0), l.unsubscribeOnline &&= (l.unsubscribeOnline(), void 0), l.unsubscribeSignal &&= (l.unsubscribeSignal(), void 0), l.cleanupBroadcastSetup &&= (l.cleanupBroadcastSetup(), void 0), l.cleanupFocusSetup &&= (l.cleanupFocusSetup(), void 0), l.cleanupOnlineSetup &&= (l.cleanupOnlineSetup(), void 0), l.isInitialized = !1, l.lastSessionRequest = 0);
		},
		triggerRefetch: d,
		broadcastSessionUpdate: f
	};
}
//#endregion
//#region node_modules/@better-auth/core/dist/env/env-impl.mjs
var L = Object.create(null), R = (e) => globalThis.process?.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? L : globalThis), z = new Proxy(L, {
	get(e, t) {
		return R()[t] ?? L[t];
	},
	has(e, t) {
		return t in R() || t in L;
	},
	set(e, t, n) {
		let r = R(!0);
		return r[t] = n, !0;
	},
	deleteProperty(e, t) {
		if (!t) return !1;
		let n = R(!0);
		return delete n[t], !0;
	},
	ownKeys() {
		let e = R(!0);
		return Object.keys(e);
	}
});
z.NODE_ENV;
function B(e, t) {
	return typeof process < "u" && process.env ? process.env[e] ?? t : typeof Deno < "u" ? Deno.env.get(e) ?? t : typeof Bun < "u" ? Bun.env[e] ?? t : t;
}
Object.freeze({
	get BETTER_AUTH_SECRET() {
		return B("BETTER_AUTH_SECRET");
	},
	get AUTH_SECRET() {
		return B("AUTH_SECRET");
	},
	get BETTER_AUTH_TELEMETRY() {
		return B("BETTER_AUTH_TELEMETRY");
	},
	get BETTER_AUTH_TELEMETRY_ID() {
		return B("BETTER_AUTH_TELEMETRY_ID");
	},
	get NODE_ENV() {
		return B("NODE_ENV", "development");
	},
	get PACKAGE_VERSION() {
		return B("PACKAGE_VERSION", "0.0.0");
	},
	get BETTER_AUTH_TELEMETRY_ENDPOINT() {
		return B("BETTER_AUTH_TELEMETRY_ENDPOINT", "");
	}
});
//#endregion
//#region node_modules/better-call/dist/error.mjs
function V() {
	let e = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
	return e === void 0 ? Object.isExtensible(Error) : Object.prototype.hasOwnProperty.call(e, "writable") ? e.writable : e.set !== void 0;
}
function H(e) {
	let t = e.split("\n    at ");
	return t.length <= 1 ? e : (t.splice(1, 1), t.join("\n    at "));
}
function ne(e, t) {
	class n extends e {
		#e;
		constructor(...e) {
			if (V()) {
				let t = Error.stackTraceLimit;
				Error.stackTraceLimit = 0, super(...e), Error.stackTraceLimit = t;
			} else super(...e);
			let t = (/* @__PURE__ */ Error()).stack;
			t && (this.#e = H(t.replace(/^Error/, this.name)));
		}
		get errorStack() {
			return this.#e;
		}
	}
	return Object.defineProperty(n.prototype, "constructor", {
		get() {
			return t;
		},
		enumerable: !1,
		configurable: !0
	}), n;
}
var U = {
	OK: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NO_CONTENT: 204,
	MULTIPLE_CHOICES: 300,
	MOVED_PERMANENTLY: 301,
	FOUND: 302,
	SEE_OTHER: 303,
	NOT_MODIFIED: 304,
	TEMPORARY_REDIRECT: 307,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	PAYMENT_REQUIRED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	NOT_ACCEPTABLE: 406,
	PROXY_AUTHENTICATION_REQUIRED: 407,
	REQUEST_TIMEOUT: 408,
	CONFLICT: 409,
	GONE: 410,
	LENGTH_REQUIRED: 411,
	PRECONDITION_FAILED: 412,
	PAYLOAD_TOO_LARGE: 413,
	URI_TOO_LONG: 414,
	UNSUPPORTED_MEDIA_TYPE: 415,
	RANGE_NOT_SATISFIABLE: 416,
	EXPECTATION_FAILED: 417,
	"I'M_A_TEAPOT": 418,
	MISDIRECTED_REQUEST: 421,
	UNPROCESSABLE_ENTITY: 422,
	LOCKED: 423,
	FAILED_DEPENDENCY: 424,
	TOO_EARLY: 425,
	UPGRADE_REQUIRED: 426,
	PRECONDITION_REQUIRED: 428,
	TOO_MANY_REQUESTS: 429,
	REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
	UNAVAILABLE_FOR_LEGAL_REASONS: 451,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504,
	HTTP_VERSION_NOT_SUPPORTED: 505,
	VARIANT_ALSO_NEGOTIATES: 506,
	INSUFFICIENT_STORAGE: 507,
	LOOP_DETECTED: 508,
	NOT_EXTENDED: 510,
	NETWORK_AUTHENTICATION_REQUIRED: 511
};
ne(class extends Error {
	status;
	body;
	headers;
	statusCode;
	constructor(e = "INTERNAL_SERVER_ERROR", t = void 0, n = {}, r = typeof e == "number" ? e : U[e]) {
		super(t?.message, t?.cause ? { cause: t.cause } : void 0), this.status = e, this.body = t, this.headers = n, this.statusCode = r, this.name = "APIError", this.status = e, this.headers = n, this.statusCode = r, this.body = t;
	}
}, Error);
//#endregion
//#region node_modules/@better-auth/core/dist/error/index.mjs
var W = class extends Error {
	constructor(e, t) {
		super(e, t), this.name = "BetterAuthError", this.message = e, this.stack = "";
	}
}, re = 47;
function ie(e) {
	let t = e.length;
	for (; t > 0 && e.charCodeAt(t - 1) === re;) t--;
	return t === e.length ? e : e.slice(0, t);
}
function ae(e) {
	try {
		return (ie(new URL(e).pathname) || "/") !== "/";
	} catch {
		throw new W(`Invalid base URL: ${e}. Please provide a valid base URL.`);
	}
}
function oe(e) {
	try {
		let t = new URL(e);
		if (t.protocol !== "http:" && t.protocol !== "https:") throw new W(`Invalid base URL: ${e}. URL must include 'http://' or 'https://'`);
	} catch (t) {
		throw t instanceof W ? t : new W(`Invalid base URL: ${e}. Please provide a valid base URL.`, { cause: t });
	}
}
function G(e, t = "/api/auth") {
	if (oe(e), ae(e)) return e;
	let n = ie(e);
	return !t || t === "/" ? n : (t = t.startsWith("/") ? t : `/${t}`, `${n}${t}`);
}
function se(e, t) {
	return !e || e.trim() === "" ? !1 : t === "proto" ? e === "http" || e === "https" : t === "host" ? [
		/\.\./,
		/\0/,
		/[\s]/,
		/^[.]/,
		/[<>'"]/,
		/javascript:/i,
		/file:/i,
		/data:/i
	].some((t) => t.test(e)) ? !1 : /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:[0-9]{1,5})?$/.test(e) || /^(\d{1,3}\.){3}\d{1,3}(:[0-9]{1,5})?$/.test(e) || /^\[[0-9a-fA-F:]+\](:[0-9]{1,5})?$/.test(e) || /^localhost(:[0-9]{1,5})?$/i.test(e) : !1;
}
function ce(e, t, n, r, i) {
	if (e) return G(e, t);
	if (r !== !1) {
		let e = z.BETTER_AUTH_URL || z.NEXT_PUBLIC_BETTER_AUTH_URL || z.PUBLIC_BETTER_AUTH_URL || z.NUXT_PUBLIC_BETTER_AUTH_URL || z.NUXT_PUBLIC_AUTH_URL || (z.BASE_URL === "/" ? void 0 : z.BASE_URL);
		if (e) return G(e, t);
	}
	let a = n?.headers.get("x-forwarded-host"), o = n?.headers.get("x-forwarded-proto");
	if (a && o && i && se(o, "proto") && se(a, "host")) try {
		return G(`${o}://${a}`, t);
	} catch {}
	if (n) {
		let e = le(n.url);
		if (!e) throw new W("Could not get origin from request. Please provide a valid base URL.");
		return G(e, t);
	}
	if (typeof window < "u" && window.location) return G(window.location.origin, t);
}
function le(e) {
	try {
		let t = new URL(e);
		return t.origin === "null" ? null : t.origin;
	} catch {
		return null;
	}
}
//#endregion
//#region node_modules/@better-auth/core/dist/utils/url.mjs
var ue = [
	"javascript:",
	"data:",
	"vbscript:"
];
function de(e) {
	let t;
	try {
		t = new URL(e);
	} catch {
		return !0;
	}
	return !ue.includes(t.protocol);
}
//#endregion
//#region node_modules/better-auth/dist/client/fetch-plugins.mjs
var fe = {
	id: "redirect",
	name: "Redirect",
	hooks: { onSuccess(e) {
		if (e.data?.url && e.data?.redirect && de(e.data.url) && typeof window < "u" && window.location && window.location) try {
			window.location.href = e.data.url;
		} catch {}
	} }
}, pe = () => typeof window > "u", me = _;
function he(e, t) {
	if (typeof window > "u") return;
	let n = e.get();
	n.data === null && t !== null && e.set({
		...n,
		data: t,
		error: null,
		isPending: !1
	});
}
function ge(e) {
	return typeof e == "object" && e && "data" in e && "error" in e ? e : {
		data: e,
		error: null
	};
}
function _e(e) {
	return !e || e.session === null && e.user === null ? null : e;
}
function ve(e, t) {
	return b(e.data, t.data) && e.error === t.error && e.isPending === t.isPending && e.isRefetching === t.isRefetching && e.refetch === t.refetch;
}
function ye(e, t) {
	let n = /* @__PURE__ */ u(!1), r, i = 0, a = 0;
	n.listen(() => {
		a++, i = 0;
	});
	let o = (e) => d(e), s = /* @__PURE__ */ u({
		data: null,
		error: null,
		isPending: !0,
		isRefetching: !1,
		refetch: o
	});
	x(s, ve);
	let c = async (t, n) => {
		let r = s.value;
		if (s.set({
			...r,
			isPending: r.data === null,
			isRefetching: !0,
			error: null,
			refetch: o
		}), t.aborted) return "aborted";
		try {
			let r = await e("/get-session", {
				method: "GET",
				query: n?.query,
				signal: t
			});
			if (t.aborted) return "aborted";
			let { data: i, error: a } = ge(r), c = "fresh";
			if (i?.needsRefresh) try {
				let n = await e("/get-session", {
					method: "POST",
					signal: t
				});
				if (t.aborted) return "aborted";
				({data: i, error: a} = ge(n));
			} catch {
				if (t.aborted) return "aborted";
				c = "stale";
			}
			if (a) {
				let e = s.value, t = a?.status === 401;
				return s.set({
					data: t ? null : e.data,
					error: a,
					isPending: !1,
					isRefetching: !1,
					refetch: o
				}), "failed";
			}
			let l = _e(i), u = s.value, d = u.data != null && l != null && b(u.data, l) ? u.data : l;
			return s.set({
				data: d,
				error: null,
				isPending: !1,
				isRefetching: !1,
				refetch: o
			}), c;
		} catch (e) {
			if (t.aborted) return "aborted";
			let n = s.value;
			return s.set({
				data: n.data,
				error: e,
				isPending: !1,
				isRefetching: !1,
				refetch: o
			}), "failed";
		}
	}, l = () => {
		let e = s.value.data?.session?.expiresAt, t = e instanceof Date ? e.getTime() : Infinity;
		return Math.min(Date.now() + me, t);
	}, d = (e) => {
		i = 0, r?.cancel();
		let t = new AbortController(), n = {
			cancel: () => t.abort(),
			promise: Promise.resolve().then(() => t.signal.aborted ? "aborted" : c(t.signal, e)),
			revision: a
		};
		r = n;
		let o = (e) => {
			r === n && (r = void 0, e === "fresh" && n.revision === a && (i = l()));
		};
		return n.promise.then(o, () => o("failed")), n.promise.then(() => void 0);
	}, f = () => r?.revision === a ? r.promise.then(() => void 0) : Date.now() < i ? Promise.resolve() : d(), p = () => {};
	return v(s, () => {
		let e;
		pe() || (e = setTimeout(() => {
			f();
		}, 0));
		let r = I({
			fetchSession: d,
			shouldPollSession: () => s.value.data != null,
			sessionSignal: n,
			options: t
		});
		return r.init(), p = r.broadcastSessionUpdate, () => {
			e && clearTimeout(e), r.cleanup();
		};
	}), {
		session: s,
		$sessionSignal: n,
		broadcastSessionUpdate: (e) => p(e)
	};
}
//#endregion
//#region node_modules/defu/dist/defu.mjs
function K(e) {
	if (typeof e != "object" || !e) return !1;
	let t = Object.getPrototypeOf(e);
	return t !== null && t !== Object.prototype && Object.getPrototypeOf(t) !== null || Symbol.iterator in e ? !1 : Symbol.toStringTag in e ? Object.prototype.toString.call(e) === "[object Module]" : !0;
}
function q(e, t, n = ".", r) {
	if (!K(t)) return q(e, {}, n, r);
	let i = { ...t };
	for (let t of Object.keys(e)) {
		if (t === "__proto__" || t === "constructor") continue;
		let a = e[t];
		a != null && (r && r(i, t, a, n) || (i[t] = Array.isArray(a) && Array.isArray(i[t]) ? [...a, ...i[t]] : K(a) && K(i[t]) ? q(a, i[t], (n ? `${n}.` : "") + t.toString(), r) : a));
	}
	return i;
}
function be(e) {
	return (...t) => t.reduce((t, n) => q(t, n, "", e), {});
}
var xe = be(), Se = class extends Error {
	constructor(e, t, n) {
		super(t || e.toString(), { cause: n }), this.status = e, this.statusText = t, this.error = n, Error.captureStackTrace(this, this.constructor);
	}
}, Ce = async (e, t) => {
	let n = t || {}, r = {
		onRequest: [t?.onRequest],
		onResponse: [t?.onResponse],
		onSuccess: [t?.onSuccess],
		onError: [t?.onError],
		onRetry: [t?.onRetry]
	};
	if (!t || !t?.plugins) return {
		url: e,
		options: n,
		hooks: r
	};
	for (let i of t?.plugins || []) {
		if (i.init) {
			let t = await i.init?.call(i, e.toString(), n);
			n = t.options || n, e = t.url;
		}
		r.onRequest.push(i.hooks?.onRequest), r.onResponse.push(i.hooks?.onResponse), r.onSuccess.push(i.hooks?.onSuccess), r.onError.push(i.hooks?.onError), r.onRetry.push(i.hooks?.onRetry);
	}
	return {
		url: e,
		options: n,
		hooks: r
	};
}, we = class {
	constructor(e) {
		this.options = e;
	}
	shouldAttemptRetry(e, t) {
		return this.options.shouldRetry ? Promise.resolve(e < this.options.attempts && this.options.shouldRetry(t)) : Promise.resolve(e < this.options.attempts);
	}
	getDelay() {
		return this.options.delay;
	}
}, Te = class {
	constructor(e) {
		this.options = e;
	}
	shouldAttemptRetry(e, t) {
		return this.options.shouldRetry ? Promise.resolve(e < this.options.attempts && this.options.shouldRetry(t)) : Promise.resolve(e < this.options.attempts);
	}
	getDelay(e) {
		return Math.min(this.options.maxDelay, this.options.baseDelay * 2 ** e);
	}
};
function Ee(e) {
	if (typeof e == "number") return new we({
		type: "linear",
		attempts: e,
		delay: 1e3
	});
	switch (e.type) {
		case "linear": return new we(e);
		case "exponential": return new Te(e);
		default: throw Error("Invalid retry strategy");
	}
}
var De = [
	"get",
	"post",
	"put",
	"patch",
	"delete"
];
function J(e) {
	if (!e.startsWith("@")) return {
		method: void 0,
		path: e
	};
	let t = e.indexOf("/"), n = e.slice(1, t === -1 ? void 0 : t);
	return De.includes(n) ? {
		method: n,
		path: t === -1 ? e : e.slice(t + 1)
	} : {
		method: void 0,
		path: e
	};
}
var Oe = (e) => e === "." || e === "..", ke = (e) => e.split(":").map((e) => encodeURIComponent(e)).join(":");
function Ae(e, t) {
	let n = t.get(e);
	if (n === void 0) return ke(e);
	if (Oe(n)) throw TypeError("Path parameters cannot be reserved path segments");
	return encodeURIComponent(n);
}
function je(e, t) {
	let { baseURL: n, params: r, query: i } = t || {
		query: {},
		params: {},
		baseURL: ""
	}, a = e.startsWith("http") ? e.split("/").slice(0, 3).join("/") : n || "", { path: o } = J(e);
	o !== e && (e = `/${o}`), a.endsWith("/") || (a += "/");
	let [s, c] = e.replace(a, "").split("?"), l = new URLSearchParams(c);
	for (let [e, t] of Object.entries(i || {})) {
		if (t == null) continue;
		let n;
		if (typeof t == "string") n = t;
		else if (Array.isArray(t)) {
			for (let n of t) l.append(e, n);
			continue;
		} else n = JSON.stringify(t);
		l.set(e, n);
	}
	let u = /* @__PURE__ */ new Map();
	if (r) {
		if (Array.isArray(r)) {
			let e = s.split("/").filter((e) => e.startsWith(":"));
			for (let [t, n] of e.entries()) {
				let e = r[t];
				u.set(n, String(e));
			}
		} else for (let [e, t] of Object.entries(r)) u.set(`:${e}`, String(t));
	}
	s = s.split("/").map((e) => Ae(e, u)).join("/"), s = s.replace(/^\/+/, "");
	let d = l.toString();
	return d = d.length > 0 ? `?${d}`.replace(/\+/g, "%20") : "", a.startsWith("http") ? new URL(`${s}${d}`, a) : `${a}${s}${d}`;
}
var Me = async (e) => {
	let t = {}, n = async (e) => typeof e == "function" ? await e() : e;
	if (e?.auth) {
		if (e.auth.type === "Bearer") {
			let r = await n(e.auth.token);
			if (!r) return t;
			t.authorization = `Bearer ${r}`;
		} else if (e.auth.type === "Basic") {
			let [r, i] = await Promise.all([n(e.auth.username), n(e.auth.password)]);
			if (!r || !i) return t;
			t.authorization = `Basic ${btoa(`${r}:${i}`)}`;
		} else if (e.auth.type === "Custom") {
			let [r, i] = await Promise.all([n(e.auth.prefix), n(e.auth.value)]);
			if (!i) return t;
			t.authorization = `${r ?? ""} ${i}`;
		}
	}
	return t;
}, Ne = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function Pe(e) {
	let t = e.headers.get("content-type"), n = /* @__PURE__ */ new Set([
		"image/svg",
		"application/xml",
		"application/xhtml",
		"application/html"
	]);
	if (!t) return "json";
	let r = t.split(";").shift() || "";
	return Ne.test(r) ? "json" : n.has(r) || r.startsWith("text/") ? "text" : "blob";
}
function Fe(e) {
	try {
		return JSON.parse(e), !0;
	} catch {
		return !1;
	}
}
function Ie(e) {
	if (e === void 0) return !1;
	let t = typeof e;
	return t === "string" || t === "number" || t === "boolean" || t === null ? !0 : t === "object" ? Array.isArray(e) ? !0 : e.buffer ? !1 : e.constructor && e.constructor.name === "Object" || typeof e.toJSON == "function" : !1;
}
function Le(e) {
	try {
		return JSON.parse(e);
	} catch {
		return e;
	}
}
function Re(e) {
	return typeof e == "function";
}
function ze(e) {
	if (e?.customFetchImpl) return e.customFetchImpl;
	if (typeof globalThis < "u" && Re(globalThis.fetch)) return globalThis.fetch;
	if (typeof window < "u" && Re(window.fetch)) return window.fetch;
	throw Error("No fetch implementation found");
}
function Be(...e) {
	let t = {};
	for (let n of e) if (n) {
		if (n instanceof Headers) n.forEach((e, n) => {
			t[n] = e;
		});
		else {
			let e = Array.isArray(n) ? n : Object.entries(n);
			for (let [n, r] of e) r != null && (t[n] = r);
		}
	}
	return t;
}
async function Ve(e) {
	let t = new Headers(Be(e?.headers, await Me(e)));
	if (!t.has("content-type")) {
		let n = He(e?.body);
		n && t.set("content-type", n);
	}
	return t;
}
function He(e) {
	return Ie(e) ? "application/json" : null;
}
function Ue(e) {
	let t = e.get("content-type");
	return t ? t.split(";")[0].trim().toLowerCase() : null;
}
function We(e, t) {
	let { body: n } = e;
	return n ? !Ie(n) || typeof n == "string" ? n : Ue(t) === "application/x-www-form-urlencoded" ? new URLSearchParams(n).toString() : JSON.stringify(n) : null;
}
function Ge(e, t) {
	if (t?.method) return t.method.toUpperCase();
	let { method: n } = J(e);
	return n ? n.toUpperCase() : t?.body ? "POST" : "GET";
}
function Ke(e, t) {
	let n;
	return !e?.signal && e?.timeout && (n = setTimeout(() => t?.abort(), e?.timeout)), {
		abortTimeout: n,
		clearTimeout: () => {
			n && clearTimeout(n);
		}
	};
}
var qe = class e extends Error {
	constructor(t, n) {
		super(n || JSON.stringify(t, null, 2)), this.issues = t, Object.setPrototypeOf(this, e.prototype);
	}
};
async function Y(e, t) {
	let n = await e["~standard"].validate(t);
	if (n.issues) throw new qe(n.issues);
	return n.value;
}
function X(e) {
	"@babel/helpers - typeof";
	return X = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, X(e);
}
function Je(e, t) {
	if (X(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (X(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Ye(e) {
	var t = Je(e, "string");
	return X(t) == "symbol" ? t : t + "";
}
function Xe(e, t, n) {
	return (t = Ye(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Ze(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Z(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Ze(Object(n), !0).forEach(function(t) {
			Xe(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Ze(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
var Q = async (e, t) => {
	var n;
	let { hooks: r, url: i, options: a } = await Ce(e, t), o = ze(a), s = new AbortController(), c = a.signal ?? s.signal, l = je(i, a), u = await Ve(a), d = We(a, u), f = Ge(i, a), p = Z(Z({}, a), {}, {
		url: l,
		headers: u,
		body: d,
		method: f,
		signal: c
	});
	for (let e of r.onRequest) if (e) {
		let t = await e(p);
		typeof t == "object" && t && Object.assign(p, t);
	}
	("pipeTo" in p && typeof p.pipeTo == "function" || typeof (t == null || (n = t.body) == null ? void 0 : n.pipe) == "function") && ("duplex" in p || (p.duplex = "half"));
	let { clearTimeout: m } = Ke(a, s), h = await o(p.url, p);
	m();
	let g = {
		response: h,
		request: p
	};
	for (let e of r.onResponse) if (e) {
		var _;
		let n = await e(Z(Z({}, g), {}, { response: t != null && (_ = t.hookOptions) != null && _.cloneResponse ? h.clone() : h }));
		n instanceof Response ? h = n : typeof n == "object" && n && (h = n.response);
	}
	if (h.ok) {
		if (p.method === "HEAD") return {
			data: "",
			error: null
		};
		let e = Pe(h), n = {
			data: null,
			response: h,
			request: p
		};
		if (e === "json" || e === "text") {
			let e = await h.text();
			n.data = await (p.jsonParser ?? Le)(e);
		} else n.data = await h[e]();
		p?.output && p.output && !p.disableValidation && (n.data = await Y(p.output, n.data));
		for (let e of r.onSuccess) if (e) {
			var v;
			await e(Z(Z({}, n), {}, { response: t != null && (v = t.hookOptions) != null && v.cloneResponse ? h.clone() : h }));
		}
		return t?.throw ? n.data : {
			data: n.data,
			error: null
		};
	}
	let y = t?.jsonParser ?? Le, b = await h.text(), x = Fe(b), S = x ? await y(b) : null, C = {
		response: h,
		responseText: b,
		request: p,
		error: Z(Z({}, S), {}, {
			status: h.status,
			statusText: h.statusText
		})
	};
	for (let e of r.onError) if (e) {
		var w;
		await e(Z(Z({}, C), {}, { response: t != null && (w = t.hookOptions) != null && w.cloneResponse ? h.clone() : h }));
	}
	if (t?.retry) {
		let n = Ee(t.retry), i = t.retryAttempt ?? 0;
		if (await n.shouldAttemptRetry(i, h)) {
			for (let e of r.onRetry) e && await e(g);
			let a = n.getDelay(i);
			return await new Promise((e) => setTimeout(e, a)), await Q(e, Z(Z({}, t), {}, { retryAttempt: i + 1 }));
		}
	}
	if (t?.throw) throw new Se(h.status, h.statusText, x ? S : b);
	return {
		data: null,
		error: Z(Z({}, S), {}, {
			status: h.status,
			statusText: h.statusText
		})
	};
}, Qe = (e) => ({
	id: "apply-schema",
	name: "Apply Schema",
	version: "1.0.0",
	async init(t, n) {
		var r;
		let i = Z(Z({}, n), e.query !== void 0 && { query: Z(Z({}, e.query), n?.query) }), a = ((r = e.plugins) == null || (r = r.find((e) => e.schema?.config ? t.startsWith(e.schema.config.baseURL || "") || t.startsWith(e.schema.config.prefix || "") : !1)) == null ? void 0 : r.schema) || e.schema;
		if (a) {
			let r = t;
			a.config?.prefix && r.startsWith(a.config.prefix) && (r = r.replace(a.config.prefix, ""), a.config.baseURL && (t = t.replace(a.config.prefix, a.config.baseURL))), a.config?.baseURL && r.startsWith(a.config.baseURL) && (r = r.replace(a.config.baseURL, "")), r.startsWith("/") && r.charAt(1) === "@" && (r = r.substring(1));
			let o = a.schema[r];
			if (o) {
				let { method: a, path: s } = J(r);
				a && (t = t.slice(0, t.length - r.length) + s);
				let c = n?.headers;
				if (o.headers && !n?.disableValidation) {
					let e = {};
					if (n?.headers) {
						if (n.headers instanceof Headers) n.headers.forEach((t, n) => {
							e[n.toLowerCase()] = t;
						});
						else if (typeof n.headers == "object") for (let [t, r] of Object.entries(n.headers)) r != null && (e[t.toLowerCase()] = r);
					}
					let t = await Y(o.headers, e), r = {};
					for (let [e, n] of Object.entries(t)) r[e.toLowerCase()] = n;
					c = r;
				}
				let l = o.method ?? a;
				if (i = Z(Z(Z(Z({}, i), l !== void 0 && { method: l }), o.output !== void 0 && { output: o.output }), c !== void 0 && { headers: c }), !n?.disableValidation) {
					if (o.query && (i.query = await Y(o.query, n?.query), i.query !== null && typeof i.query == "object")) {
						let t = Z({}, e.query);
						for (let e of Object.keys(t)) n?.query && Object.prototype.hasOwnProperty.call(n.query, e) && (t[e] = n.query[e]);
						i.query = Z(Z({}, t), i.query);
					}
					i = Z(Z({}, i), {}, {
						body: o.input ? await Y(o.input, n?.body) : n?.body,
						params: o.params ? await Y(o.params, n?.params) : n?.params
					});
				}
				return {
					url: t,
					options: i
				};
			}
		}
		return Z({ url: t }, (n !== void 0 || e.query !== void 0) && { options: i });
	}
}), $e = (e) => {
	async function t(t, n) {
		let r = Z(Z(Z({}, e), n), {}, {
			headers: Be(e?.headers, n?.headers),
			plugins: [
				...e?.plugins || [],
				Qe(e || {}),
				...n?.plugins || []
			]
		});
		if (e?.catchAllError) try {
			return await Q(t, r);
		} catch (e) {
			return {
				data: null,
				error: {
					status: 500,
					statusText: "Fetch Error",
					message: "Fetch related error. Captured by catchAllError option. See error property for more details.",
					error: e
				}
			};
		}
		return await Q(t, r);
	}
	return t;
}, et = (e) => {
	if (typeof process > "u") return;
	let t = e ?? "/api/auth";
	if (process.env.NEXT_PUBLIC_AUTH_URL) return process.env.NEXT_PUBLIC_AUTH_URL;
	if (typeof window > "u") {
		if (process.env.NEXTAUTH_URL) try {
			return process.env.NEXTAUTH_URL;
		} catch {}
		if (process.env.VERCEL_URL) try {
			let e = process.env.VERCEL_URL.startsWith("http") ? "" : "https://";
			return `${new URL(`${e}${process.env.VERCEL_URL}`).origin}${t}`;
		} catch {}
	}
}, tt = (e, t) => {
	let n = "credentials" in Request.prototype, r = ce(e?.baseURL, e?.basePath, void 0, t) ?? et(e?.basePath) ?? "/api/auth", i = e?.plugins?.flatMap((e) => e.fetchPlugins).filter((e) => e !== void 0) || [], a = {
		id: "lifecycle-hooks",
		name: "lifecycle-hooks",
		hooks: {
			onSuccess: e?.fetchOptions?.onSuccess,
			onError: e?.fetchOptions?.onError,
			onRequest: e?.fetchOptions?.onRequest,
			onResponse: e?.fetchOptions?.onResponse
		}
	}, { onSuccess: o, onError: s, onRequest: c, onResponse: l, ...u } = e?.fetchOptions || {}, d = $e({
		baseURL: r,
		...n ? { credentials: "include" } : {},
		method: "GET",
		jsonParser(e) {
			return e ? N(e, { strict: !1 }) : null;
		},
		customFetchImpl: fetch,
		...u,
		plugins: [
			a,
			...u.plugins || [],
			...e?.disableDefaultFetchPlugins ? [] : [fe],
			...i
		]
	}), { $sessionSignal: f, session: p, broadcastSessionUpdate: m } = ye(d, e), h = !1, g = (e) => {
		h || e === null || (h = !0, he(p, e));
	}, _ = e?.plugins || [], v = {}, y = {
		$sessionSignal: f,
		session: p
	}, b = {
		"/sign-out": "POST",
		"/revoke-sessions": "POST",
		"/revoke-other-sessions": "POST",
		"/delete-user": "POST"
	}, x = [{
		signal: "$sessionSignal",
		matcher(e) {
			return e === "/sign-out" || e === "/update-user" || e === "/update-session" || e === "/sign-up/email" || e === "/sign-in/email" || e === "/delete-user" || e === "/verify-email" || e === "/revoke-sessions" || e === "/revoke-session" || e === "/revoke-other-sessions" || e === "/change-email" || e === "/change-password";
		},
		callback(e) {
			e === "/sign-out" ? m("signout") : (e === "/update-user" || e === "/update-session") && m("updateUser");
		}
	}];
	for (let e of _) e.getAtoms && Object.assign(y, e.getAtoms?.(d)), e.pathMethods && Object.assign(b, e.pathMethods), e.atomListeners && x.push(...e.atomListeners);
	let S = {
		notify: (e) => {
			y[e].set(!y[e].get());
		},
		listen: (e, t) => {
			y[e].subscribe(t);
		},
		atoms: y
	};
	for (let t of _) t.getActions && (v = xe(t.getActions?.(d, S, e) ?? {}, v));
	return {
		get baseURL() {
			return r;
		},
		pluginsActions: v,
		pluginsAtoms: y,
		pluginPathMethods: b,
		atomListeners: x,
		hydrateSession: g,
		$sessionSignal: f,
		$fetch: d,
		$store: S
	};
};
//#endregion
//#region node_modules/better-auth/dist/utils/is-atom.mjs
function nt(e) {
	return typeof e == "object" && !!e && "get" in e && typeof e.get == "function" && "lc" in e && typeof e.lc == "number";
}
//#endregion
//#region node_modules/@better-auth/core/dist/utils/string.mjs
function rt(e) {
	return e.charAt(0).toUpperCase() + e.slice(1);
}
var it = /[\p{Ll}\d]+|\p{Lu}+(?!\p{Ll})|\p{Lu}[\p{Ll}\d]+|\p{Lo}+/gu, at = /['\u2019]/g;
function ot(e) {
	return e.replace(at, "").match(it) ?? [];
}
function st(e) {
	return ot(e).map((e) => e.toLowerCase()).join("-");
}
//#endregion
//#region node_modules/better-auth/dist/client/proxy.mjs
function ct(e, t, n) {
	let r = t[e], { fetchOptions: i, query: a, ...o } = n || {};
	return r || (i?.method ? i.method : o && Object.keys(o).length > 0 ? "POST" : "GET");
}
function lt(e, t, n, r, i) {
	function a(o = []) {
		return new Proxy(function() {}, {
			get(t, n) {
				if (typeof n != "string" || n === "then" || n === "catch" || n === "finally") return;
				let r = [...o, n], i = e;
				for (let e of r) if (i && typeof i == "object" && e in i) i = i[e];
				else {
					i = void 0;
					break;
				}
				return typeof i == "function" || nt(i) ? i : a(r);
			},
			apply: async (e, a, s) => {
				let c = "/" + o.map(st).join("/"), l = s[0] || {}, u = s[1] || {}, { query: d, fetchOptions: f, ...p } = l, m = {
					...u,
					...f
				}, h = ct(c, n, l);
				return await t(c, {
					...m,
					body: h === "GET" ? void 0 : {
						...p,
						...m?.body || {}
					},
					query: d || m?.query,
					method: h,
					async onSuccess(e) {
						if (await m?.onSuccess?.(e), !i || m.disableSignal) return;
						let t = i.filter((e) => e.matcher(c));
						if (!t.length) return;
						let n = /* @__PURE__ */ new Set();
						for (let e of t) {
							let t = r[e.signal];
							if (!t) return;
							if (n.has(e.signal)) continue;
							n.add(e.signal);
							let i = t.get();
							setTimeout(() => {
								t.set(!i);
							}, 10), e.callback?.(c);
						}
					}
				});
			}
		});
	}
	return a();
}
//#endregion
//#region node_modules/better-auth/dist/client/vanilla.mjs
function ut(e) {
	let { pluginPathMethods: t, pluginsActions: n, pluginsAtoms: r, hydrateSession: i, $fetch: a, atomListeners: o, $store: s } = tt(e), c = {};
	for (let [e, t] of Object.entries(r)) c[`use${rt(e)}`] = t;
	return lt({
		...n,
		...c,
		hydrateSession: i,
		$fetch: a,
		$store: s
	}, a, t, r, o);
}
//#endregion
//#region app/home-auth.mjs
var $ = null;
function dt(e) {
	if (e.querySelector("[data-home-auth-style]")) return;
	let t = e.createElement("link");
	t.rel = "stylesheet", t.href = "/assets/home-auth.css?v=20261024-blue-brand", t.dataset.homeAuthStyle = "", e.head.append(t);
}
async function ft({ mode: e = "login", callbackURL: t = location.href, errorCallbackURL: n, beforeRedirect: r = async () => {} } = {}) {
	if ($) return $.promise;
	let i = document, a = window;
	if (n === void 0) {
		let e = new URL(a.location.href);
		e.searchParams.delete("auth_return"), e.searchParams.delete("auth_nonce"), e.searchParams.set("auth_cancelled", "1"), n = e.href;
	}
	let o = /^zh(?:-|$)/i.test(i.documentElement.lang), s = (e, t) => o ? t : e, c = ut({
		baseURL: a.location.origin,
		basePath: "/api/auth",
		fetchOptions: { credentials: "same-origin" },
		disableDefaultFetchPlugins: !0
	});
	dt(i);
	let l = i.activeElement, u = i.body.style.overflow, d = [...i.body.children].map((e) => [e, e.inert]), f = !0, p = !1, m, h, g = new Promise((e) => {
		h = e;
	});
	$ = { promise: g }, e = e === "register" ? "register" : "login";
	let _ = (e, t = "", n) => {
		let r = i.createElement(e);
		return r.className = t, n !== void 0 && (r.textContent = n), r.style.boxSizing = "border-box", r;
	}, v = (e, t) => {
		let n = _("button", e, t);
		return n.type = "button", n;
	}, y = _("div", "auth-dialog-backdrop");
	y.dataset.homeAuth = "", y.style.setProperty("--lime", "#78ded4"), y.style.setProperty("--line", "rgba(255,255,255,.1)"), y.style.setProperty("--text", "#f5f3ed"), y.style.color = "#f5f3ed", y.style.fontFamily = "Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif", y.style.zIndex = "1000";
	let b = _("section", "auth-dialog");
	b.setAttribute("role", "dialog"), b.setAttribute("aria-modal", "true"), b.setAttribute("aria-labelledby", "home-auth-title"), b.setAttribute("aria-describedby", "home-auth-description");
	let x = v("auth-dialog-close", "×");
	x.setAttribute("aria-label", s("Close login dialog", "关闭登录窗口"));
	let S = _("h2");
	S.id = "home-auth-title";
	let C = _("p", "", s("Continue with Google to sign in or create your account.", "使用 Google 登录或创建账户。"));
	C.id = "home-auth-description";
	let w = _("div", "auth-mode-tabs");
	w.setAttribute("role", "tablist"), w.setAttribute("aria-label", s("Authentication mode", "登录或注册"));
	let T = v("", s("Log in", "登录")), E = v("", s("Register", "注册"));
	for (let [t, n] of [[T, "login"], [E, "register"]]) t.id = `home-auth-${n}`, t.setAttribute("role", "tab"), t.setAttribute("aria-controls", "home-auth-form"), t.addEventListener("click", () => V(n)), t.addEventListener("keydown", (t) => {
		!p && [
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End"
		].includes(t.key) && (t.preventDefault(), V(t.key === "Home" ? "login" : t.key === "End" || e === "login" ? "register" : "login"), (e === "login" ? T : E).focus());
	});
	w.append(T, E);
	let D = v("google-auth-button"), O = _("span", "", "G");
	O.setAttribute("aria-hidden", "true"), D.append(O, _("span", "", s("Continue with Google", "使用 Google 继续"))), _("div", "auth-divider").append(_("span", "", s("or use email", "或使用邮箱")));
	let k = _("form");
	k.id = "home-auth-form", k.setAttribute("role", "tabpanel");
	let A = (e, t, n, r) => {
		let i = _("label", "", e), a = _("input");
		return a.name = t, a.type = n, a.autocomplete = r, a.required = !0, n === "password" && (a.minLength = 8), i.append(a), [i, a];
	}, [ee, j] = A(s("Email", "邮箱"), "email", "email", "email");
	j.inputMode = "email", j.spellcheck = !1, j.autocapitalize = "none";
	let [te, M] = A(s("Password", "密码"), "password", "password", "current-password"), [N, P] = A(s("Confirm password", "确认密码"), "confirmPassword", "password", "new-password"), F = _("div", "auth-error");
	F.setAttribute("role", "alert"), F.hidden = !0;
	let I = v("auth-submit");
	I.type = "submit", k.append(ee, te, N, F, I), b.append(x, _("span", "auth-eyebrow", s("SEEDANCE ACCOUNT", "SEEDANCE 账户")), S, C), b.append(D, F), y.append(b);
	function L() {
		F.textContent = "", F.hidden = !0;
	}
	function R(e) {
		f && (F.textContent = e, F.hidden = !1);
	}
	function z(e, t = !1) {
		return {
			INVALID_EMAIL_OR_PASSWORD: s("Invalid email or password.", "邮箱或密码不正确。"),
			USER_ALREADY_EXISTS: s("This email is already registered. Please log in.", "该邮箱已注册，请登录。"),
			USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: s("This email is already registered. Please log in.", "该邮箱已注册，请登录。"),
			EMAIL_NOT_VERIFIED: s("Please verify your email before signing in.", "请先验证邮箱，再登录。"),
			TOO_MANY_REQUESTS: s("Too many attempts. Please wait and try again.", "操作过于频繁，请稍后重试。")
		}[e?.code] || (t ? s("Google sign-in failed. Please try again.", "Google 登录失败，请重试。") : s("Authentication failed. Please try again.", "验证失败，请重试。"));
	}
	function B(t) {
		p = t, b.setAttribute("aria-busy", String(t));
		for (let e of [
			D,
			I,
			T,
			E,
			j,
			M,
			P
		]) e.disabled = t;
		I.textContent = t ? s("Please wait…", "请稍候…") : e === "login" ? s("Log in", "登录") : s("Create account", "创建账户");
	}
	function V(t) {
		if (!p) {
			e = t, P.value = "", L(), S.textContent = e === "login" ? s("Welcome back", "欢迎回来") : s("Create your account", "创建你的账户"), N.hidden = e !== "register", N.style.display = e === "register" ? "grid" : "none", P.required = e === "register", M.autocomplete = e === "login" ? "current-password" : "new-password";
			for (let [t, n] of [[T, "login"], [E, "register"]]) t.classList.toggle("is-active", e === n), t.setAttribute("aria-selected", String(e === n)), t.setAttribute("tabindex", e === n ? "0" : "-1");
			k.setAttribute("aria-labelledby", e === "login" ? T.id : E.id), B(!1);
		}
	}
	function H(e = !1) {
		if (f) {
			f = !1, $ = null, m?.abort(), i.removeEventListener("keydown", U, !0), i.removeEventListener("focusin", W, !0), y.remove(), i.body.style.overflow = u;
			for (let [e, t] of d) e.inert = t;
			l?.isConnected && !l.inert && l.focus({ preventScroll: !0 }), h(e);
		}
	}
	function ne() {
		return [...b.querySelectorAll("button, input, a[href], select, textarea, [tabindex]")].filter((e) => !e.disabled && e.tabIndex >= 0 && !e.closest("[hidden]"));
	}
	function U(e) {
		if (e.key === "Escape") {
			e.preventDefault(), e.stopPropagation(), H();
			return;
		}
		if (e.key !== "Tab") return;
		let t = ne(), n = t[0], r = t.at(-1);
		(!b.contains(i.activeElement) || e.shiftKey && i.activeElement === n || !e.shiftKey && i.activeElement === r) && (e.preventDefault(), (e.shiftKey ? r : n)?.focus());
	}
	function W(e) {
		f && !b.contains(e.target) && x.focus();
	}
	k.addEventListener("submit", async (e) => {
		e.preventDefault();
	}), D.addEventListener("click", async () => {
		if (!f || p) return;
		L(), B(!0);
		let e = !1;
		try {
			if (await r(), !f) return;
			m = new AbortController();
			let i = await c.signIn.social({
				provider: "google",
				callbackURL: t,
				errorCallbackURL: n
			}, { signal: m.signal });
			if (!f) return;
			if (i.error) {
				R(z(i.error, !0));
				return;
			}
			let o = new URL(i.data?.url);
			if (!i.data?.redirect || o.protocol !== "https:" || o.username || o.password) throw Error("Invalid provider redirect");
			a.location.assign(o.href), e = !0;
		} catch {
			R(z(void 0, !0));
		} finally {
			f && !e && B(!1);
		}
	}), x.addEventListener("click", () => H()), y.addEventListener("mousedown", (e) => {
		e.target === y && H();
	}), V(e);
	for (let [e] of d) e.inert = !0;
	return i.body.style.overflow = "hidden", i.body.append(y), i.addEventListener("keydown", U, !0), i.addEventListener("focusin", W, !0), D.focus({ preventScroll: !0 }), g;
}
//#endregion
export { ft as openHomeAuth };
