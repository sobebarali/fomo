import "server-only";

// Process-singleton fan-out registry. Channels: "trending", "token:<addr>", "trades:<addr>".
// Works because Railway runs one long-lived Node process (see Dockerfile). Multiple replicas would
// each keep their own registry — still one upstream poll per replica, not per client.

export type ChannelMessage = (channel: string, data: unknown) => void;

const subscribers = new Map<string, Set<ChannelMessage>>();

/** Register `onMessage` for every channel; returns an unsubscribe that removes it from all of them. */
export function subscribe(
  channels: string[],
  onMessage: ChannelMessage
): () => void {
  for (const channel of channels) {
    let set = subscribers.get(channel);
    if (!set) {
      set = new Set();
      subscribers.set(channel, set);
    }
    set.add(onMessage);
  }
  return () => {
    for (const channel of channels) {
      const set = subscribers.get(channel);
      set?.delete(onMessage);
      if (set && set.size === 0) {
        subscribers.delete(channel);
      }
    }
  };
}

/** Push `data` to every subscriber of `channel`. */
export function publish(channel: string, data: unknown): void {
  const set = subscribers.get(channel);
  if (!set) {
    return;
  }
  for (const onMessage of set) {
    onMessage(channel, data);
  }
}

export function hasSubscribers(): boolean {
  return subscribers.size > 0;
}

/** Token addresses with ≥1 active `token:`/`trades:` subscriber — the set the poller refreshes. */
export function watchedTokens(): string[] {
  const addresses = new Set<string>();
  for (const channel of subscribers.keys()) {
    const [kind, address] = channel.split(":");
    if (address && (kind === "token" || kind === "trades")) {
      addresses.add(address);
    }
  }
  return [...addresses];
}
