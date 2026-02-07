import { describe, expect, it, vi, beforeEach } from "vitest";
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
  beforeEach(() => {
    hydrateMock.mockClear();
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
});
