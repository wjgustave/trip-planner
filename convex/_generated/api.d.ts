/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as destinations from "../destinations.js";
import type * as lib_pin from "../lib/pin.js";
import type * as lib_presence from "../lib/presence.js";
import type * as permissions from "../permissions.js";
import type * as presenceMutations from "../presenceMutations.js";
import type * as seed from "../seed.js";
import type * as travelSegments from "../travelSegments.js";
import type * as travellers from "../travellers.js";
import type * as trip from "../trip.js";
import type * as vibesMutations from "../vibesMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  destinations: typeof destinations;
  "lib/pin": typeof lib_pin;
  "lib/presence": typeof lib_presence;
  permissions: typeof permissions;
  presenceMutations: typeof presenceMutations;
  seed: typeof seed;
  travelSegments: typeof travelSegments;
  travellers: typeof travellers;
  trip: typeof trip;
  vibesMutations: typeof vibesMutations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
