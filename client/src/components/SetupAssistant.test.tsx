// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listQuery: vi.fn(),
  preferencesQuery: vi.fn(),
  firebaseQuery: vi.fn(),
  saveProvider: vi.fn(),
  savePreferences: vi.fn(),
  invalidateProviders: vi.fn(),
  invalidatePreferences: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      agent: { providers: { list: { invalidate: mocks.invalidateProviders } } },
      studio: { preferences: { get: { invalidate: mocks.invalidatePreferences } } },
    }),
    agent: {
      providers: {
        list: { useQuery: mocks.listQuery },
        save: { useMutation: () => ({ mutate: mocks.saveProvider, isPending: false }) },
      },
    },
    studio: {
      preferences: {
        get: { useQuery: mocks.preferencesQuery },
        update: { useMutation: () => ({ mutate: mocks.savePreferences, isPending: false }) },
      },
      firebase: { status: { useQuery: mocks.firebaseQuery } },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SetupAssistant } from "./SetupAssistant";

const ready = { data: [], isLoading: false, isError: false };

describe("SetupAssistant", () => {
  beforeEach(() => {
    mocks.listQuery.mockReturnValue(ready);
    mocks.preferencesQuery.mockReturnValue({ data: { firebaseProjectId: null, firebaseAuthConfigured: false, firestoreConfigured: false }, isLoading: false, isError: false });
    mocks.firebaseQuery.mockReturnValue({ data: { enabled: false, reason: "missing_admin_credentials" }, isLoading: false, isError: false });
    mocks.saveProvider.mockReset();
    mocks.savePreferences.mockReset();
  });

  afterEach(cleanup);

  it("informa carregamento e bloqueia edição até o estado protegido chegar", () => {
    mocks.listQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<SetupAssistant open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando o estado protegido");
    expect(document.querySelector("fieldset")).toBeDisabled();
  });

  it("informa falha de consulta e bloqueia alterações", () => {
    mocks.firebaseQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<SetupAssistant open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível verificar a configuração atual");
    expect(document.querySelector("fieldset")).toBeDisabled();
  });

  it("mostra o diagnóstico Firebase do servidor e salva somente o status guiado", () => {
    render(<SetupAssistant open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/aguardando credenciais administrativas protegidas/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("ID do projeto Firebase"), { target: { value: "lunex-firebase" } });
    fireEvent.click(screen.getByText("Firebase Authentication"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar status do Firebase" }));

    expect(mocks.savePreferences).toHaveBeenCalledWith({ firebaseProjectId: "lunex-firebase", firebaseAuthConfigured: true, firestoreConfigured: false });
  });

  it("envia uma chave apenas para a mutação protegida do provedor", () => {
    render(<SetupAssistant open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Chave para Texto 1/), { target: { value: "sk-test-secret-value" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar Texto 1" }));

    expect(mocks.saveProvider).toHaveBeenCalledWith(expect.objectContaining({ slot: "text_1", provider: "openai", apiKey: "sk-test-secret-value", enabled: true }));
    expect(screen.queryByText("sk-test-secret-value")).not.toBeInTheDocument();
  });
});
