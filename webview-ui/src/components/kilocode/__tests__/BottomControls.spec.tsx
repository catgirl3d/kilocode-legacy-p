import React from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import BottomControls from "../BottomControls"

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("../rules/KiloRulesToggleModal", () => ({
	__esModule: true,
	default: () => <div data-testid="kilo-rules-toggle-modal" />,
}))

vi.mock("../BottomApiConfig", () => ({
	BottomApiConfig: () => <div data-testid="bottom-api-config" />,
}))

describe("BottomControls", () => {
	it("renders the staged diff button only when an insert handler is provided", () => {
		const { rerender } = render(<BottomControls />)

		expect(screen.queryByTitle("Insert staged diff")).not.toBeInTheDocument()

		rerender(<BottomControls onInsertStagedDiff={vi.fn()} />)

		expect(screen.getByTitle("Insert staged diff")).toBeInTheDocument()
	})

	it("calls the staged diff insert handler when the button is clicked", () => {
		const onInsertStagedDiff = vi.fn()

		render(<BottomControls onInsertStagedDiff={onInsertStagedDiff} />)

		fireEvent.click(screen.getByTitle("Insert staged diff"))

		expect(onInsertStagedDiff).toHaveBeenCalledTimes(1)
	})
})
