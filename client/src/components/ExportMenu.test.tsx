// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportMenu } from "./ExportMenu";

describe("ExportMenu", () => {
  afterEach(cleanup);

  it("oferece exportações Markdown e PDF e encaminha o formato selecionado", () => {
    const onExport = vi.fn();
    render(<ExportMenu subject="conversa" onExport={onExport} />);
    const trigger = screen.getByRole("button", { name: "Exportar conversa" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

    fireEvent.click(screen.getByText("Exportar Markdown"));
    expect(onExport).toHaveBeenCalledWith("markdown");
  });

  it("desabilita o acionador enquanto a exportação está pendente", () => {
    render(<ExportMenu subject="artefato" onExport={vi.fn()} pending />);
    expect(screen.getByRole("button", { name: "Exportar artefato" })).toBeDisabled();
  });

  it("permite abrir explicitamente as opções para validação visual sem desabilitar ações", () => {
    render(<ExportMenu subject="conversa" onExport={vi.fn()} defaultOpen />);
    expect(screen.getByText("Exportar Markdown")).toBeVisible();
    expect(screen.getByText("Exportar PDF")).toBeVisible();
  });
});
