const apiUrl = process.env.SMOKE_API_URL?.replace(/\/$/, "");
const webUrl = process.env.SMOKE_WEB_URL?.replace(/\/$/, "");
const password = process.env.SMOKE_PASSWORD;

if (!apiUrl || !webUrl || !password) {
  throw new Error(
    "SMOKE_API_URL, SMOKE_WEB_URL and SMOKE_PASSWORD are required",
  );
}

if (password.length < 12) {
  throw new Error("SMOKE_PASSWORD must contain at least 12 characters");
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    body: options.json === undefined ? options.body : JSON.stringify(options.json),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path}: ${response.status} ${message}`);
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requestedSuffix = process.env.SMOKE_SUFFIX;
if (requestedSuffix && !/^[a-z0-9]{3,18}$/.test(requestedSuffix)) {
  throw new Error("SMOKE_SUFFIX must contain 3-18 lowercase letters or numbers");
}
const suffix =
  requestedSuffix ??
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function register(label) {
  return request("/auth/register", {
    method: "POST",
    json: {
      username: `smoke.${suffix}.${label}`,
      email: `smoke.${suffix}.${label}@example.invalid`,
      password,
      fullName: `Smoke ${label.toUpperCase()}`,
    },
  });
}

const webResponse = await fetch(webUrl);
assert(webResponse.ok, `Web returned ${webResponse.status}`);

const health = await request("/health");
assert(health.status === "ok" && health.neo4j === "connected", "Health check failed");

const [accountA, accountB, accountC] = await Promise.all([
  register("a"),
  register("b"),
  register("c"),
]);

const tokenA = accountA.accessToken;
const tokenB = accountB.accessToken;
const tokenC = accountC.accessToken;
assert(tokenA && tokenB && tokenC, "Registration did not return access tokens");

const me = await request("/users/me", {
  method: "PATCH",
  token: tokenA,
  json: { bio: "Misonet deployment smoke test" },
});
assert(me.bio === "Misonet deployment smoke test", "Profile update failed");

await request(`/users/${accountB.user.personId}/follow`, { method: "POST", token: tokenA });
const friendshipAB = await request(`/users/${accountA.user.personId}/follow`, {
  method: "POST",
  token: tokenB,
});
assert(friendshipAB.isFriend === true, "Mutual follow A/B did not create FRIEND");

await request(`/users/${accountC.user.personId}/follow`, { method: "POST", token: tokenB });
const friendshipBC = await request(`/users/${accountB.user.personId}/follow`, {
  method: "POST",
  token: tokenC,
});
assert(friendshipBC.isFriend === true, "Mutual follow B/C did not create FRIEND");

const recommendations = await request("/recommendations/friends?limit=20", { token: tokenA });
assert(
  recommendations.items.some((item) => item.personId === accountC.user.personId),
  "Friend-of-friend recommendation did not include account C",
);

const post = await request("/posts", {
  method: "POST",
  token: tokenA,
  json: { content: `Deployment smoke ${suffix}`, privacy: "PUBLIC" },
});
const likedPost = await request(`/posts/${post.postId}/like`, {
  method: "POST",
  token: tokenB,
});
assert(likedPost.likedByCurrentUser && likedPost.likeCount >= 1, "Post like failed");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZV9sAAAAASUVORK5CYII=",
  "base64",
);
const form = new FormData();
form.set("file", new Blob([png], { type: "image/png" }), "smoke.png");
const media = await request("/uploads/post-media", {
  method: "POST",
  token: tokenA,
  body: form,
});
assert(media.publicId && media.secureUrl, "Cloudinary upload metadata is missing");

const mediaPost = await request("/posts", {
  method: "POST",
  token: tokenA,
  json: { content: `Media smoke ${suffix}`, privacy: "PUBLIC", media },
});
assert(mediaPost.media.length === 1, "Media node/HAS_MEDIA creation failed");

await request(`/posts/${mediaPost.postId}`, { method: "DELETE", token: tokenA });
await request(`/posts/${post.postId}`, { method: "DELETE", token: tokenA });

await request(`/users/${accountB.user.personId}/follow`, { method: "DELETE", token: tokenA });
await request(`/users/${accountA.user.personId}/follow`, { method: "DELETE", token: tokenB });
await request(`/users/${accountC.user.personId}/follow`, { method: "DELETE", token: tokenB });
await request(`/users/${accountB.user.personId}/follow`, { method: "DELETE", token: tokenC });

console.log("Misonet deployment smoke test passed", {
  web: true,
  neo4j: true,
  auth: true,
  profile: true,
  post: true,
  like: true,
  mutualFriend: true,
  recommendation: true,
  cloudinaryUploadAndDelete: true,
});
