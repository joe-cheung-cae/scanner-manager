import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";

const hydrateMock = vi.fn(async () => undefined);

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/store/appStore", () => ({
  useAppStore: (selector: (state: { hydrate: () => Promise<void>; storageFallback: boolean; storageError?: string }) => unknown) =>
    selector({
      hydrate: hydrateMock,
      storageFallback: false,
      storageError: undefined,
    }),
}));

describe("AppShell", () => {
  const registerMock = vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration));
  const unregisterMock = vi.fn(() => Promise.resolve(true));
  const getRegistrationsMock = vi.fn(() =>
    Promise.resolve([
      {
        unregister: unregisterMock,
      } as unknown as ServiceWorkerRegistration,
    ]),
  );

  beforeEach(() => {
    hydrateMock.mockClear();
    registerMock.mockClear();
    unregisterMock.mockClear();
    getRegistrationsMock.mockClear();
    vi.stubGlobal("caches", {
      keys: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(() => Promise.resolve(true)),
    });
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { register: registerMock, getRegistrations: getRegistrationsMock },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("首帧应先显示稳定网络状态占位，避免 hydration mismatch", async () => {
    render(
      <AppShell>
        <div>内容</div>
      </AppShell>,
    );

    expect(screen.getByText("网络状态检测中")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("网络状态检测中")).not.toBeInTheDocument();
    });
  });

  it("开发环境不应注册 service worker，避免缓存旧页面", async () => {
    vi.stubEnv("NODE_ENV", "development");

    render(
      <AppShell>
        <div>内容</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(hydrateMock).toHaveBeenCalled();
    });
    expect(registerMock).not.toHaveBeenCalled();
    expect(getRegistrationsMock).toHaveBeenCalled();
    expect(unregisterMock).toHaveBeenCalled();
  });

  it("生产环境应注册 service worker", async () => {
    vi.stubEnv("NODE_ENV", "production");

    render(
      <AppShell>
        <div>内容</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/sw.js");
    });
  });
});
