import type { Mock } from "vitest"
import * as vscode from "vscode"
import { ClineProvider } from "../../core/webview/ClineProvider"

import {
	getActiveEditorProviderOrLog,
	getSidebarProviderOrLog,
	getVisibleProviderOrLog,
	registerCommands,
} from "../registerCommands"
import { getCommand } from "../../utils/commands"

vi.mock("execa", () => ({
	execa: vi.fn(),
}))

vi.mock("../../utils/commands", () => ({
	getCommand: vi.fn((commandId: string) => `kilo-code.${commandId}`),
}))

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		get instance() {
			return {
				captureTitleButtonClicked: vi.fn(),
			}
		},
	},
}))

vi.mock("../../core/kilocode/agent-manager/AgentManagerProvider", () => ({
	AgentManagerProvider: vi.fn().mockImplementation(() => ({
		dispose: vi.fn(),
		openPanel: vi.fn(),
	})),
}))

vi.mock("vscode", () => ({
	CodeActionKind: {
		QuickFix: { value: "quickfix" },
		RefactorRewrite: { value: "refactor.rewrite" },
	},
	commands: {
		registerCommand: vi.fn().mockImplementation((_command: string, _callback: unknown) => ({ dispose: vi.fn() })),
		executeCommand: vi.fn(),
	},
	env: {
		openExternal: vi.fn(),
	},
	window: {
		createTextEditorDecorationType: vi.fn().mockReturnValue({ dispose: vi.fn() }),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: {
					fsPath: "/mock/workspace",
				},
			},
		],
	},
}))

vi.mock("../../core/webview/ClineProvider")

describe("getVisibleProviderOrLog", () => {
	let mockOutputChannel: vscode.OutputChannel

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}
		vi.clearAllMocks()
	})

	it("returns the visible provider if found", () => {
		const mockProvider = {} as ClineProvider
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(mockProvider)

		const result = getVisibleProviderOrLog(mockOutputChannel)

		expect(result).toBe(mockProvider)
		expect(mockOutputChannel.appendLine).not.toHaveBeenCalled()
	})

	it("logs and returns undefined if no provider found", () => {
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(undefined)

		const result = getVisibleProviderOrLog(mockOutputChannel)

		expect(result).toBeUndefined()
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Cannot find any visible Kilo Code instances.")
	})
})

describe("getActiveEditorProviderOrLog", () => {
	let mockOutputChannel: vscode.OutputChannel

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}
		vi.clearAllMocks()
	})

	it("returns the active editor provider if found", () => {
		const mockProvider = {} as ClineProvider
		;(ClineProvider.getActiveEditorInstance as Mock).mockReturnValue(mockProvider)

		const result = getActiveEditorProviderOrLog(mockOutputChannel)

		expect(result).toBe(mockProvider)
		expect(mockOutputChannel.appendLine).not.toHaveBeenCalled()
	})

	it("logs and returns undefined if no active editor provider found", () => {
		;(ClineProvider.getActiveEditorInstance as Mock).mockReturnValue(undefined)

		const result = getActiveEditorProviderOrLog(mockOutputChannel)

		expect(result).toBeUndefined()
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Cannot find any active Kilo Code editor instances.")
	})
})

describe("getSidebarProviderOrLog", () => {
	let mockOutputChannel: vscode.OutputChannel

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}
		vi.clearAllMocks()
	})

	it("returns the sidebar provider if found", () => {
		const mockProvider = {} as ClineProvider
		;(ClineProvider.getSidebarInstance as Mock).mockReturnValue(mockProvider)

		const result = getSidebarProviderOrLog(mockOutputChannel)

		expect(result).toBe(mockProvider)
		expect(mockOutputChannel.appendLine).not.toHaveBeenCalled()
	})

	it("logs and returns undefined if no sidebar provider found", () => {
		;(ClineProvider.getSidebarInstance as Mock).mockReturnValue(undefined)

		const result = getSidebarProviderOrLog(mockOutputChannel)

		expect(result).toBeUndefined()
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Cannot find the Kilo Code sidebar instance.")
	})
})

describe("registerCommands instance-aware title routing", () => {
	let mockOutputChannel: vscode.OutputChannel
	let mockContext: vscode.ExtensionContext
	let sidebarProvider: ClineProvider
	let editorProvider: ClineProvider

	const getRegisteredCallback = (commandId: string) => {
		const registeredCommandId = getCommand(commandId as any)
		const registration = (vscode.commands.registerCommand as Mock).mock.calls.find(
			([registeredId]) => registeredId === registeredCommandId,
		)

		expect(registration).toBeDefined()
		return registration?.[1] as (...args: unknown[]) => unknown
	}

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}

		mockContext = {
			subscriptions: [],
		} as unknown as vscode.ExtensionContext

		sidebarProvider = {
			removeClineFromStack: vi.fn().mockResolvedValue(undefined),
			refreshWorkspace: vi.fn().mockResolvedValue(undefined),
			postMessageToWebview: vi.fn().mockResolvedValue(undefined),
			providerSettingsManager: {},
			contextProxy: {},
			customModesManager: {},
		} as unknown as ClineProvider

		editorProvider = {
			removeClineFromStack: vi.fn().mockResolvedValue(undefined),
			refreshWorkspace: vi.fn().mockResolvedValue(undefined),
			postMessageToWebview: vi.fn().mockResolvedValue(undefined),
		} as unknown as ClineProvider
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(editorProvider)
		;(ClineProvider.getSidebarInstance as Mock).mockReturnValue(sidebarProvider)
		;(ClineProvider.getInstance as Mock).mockResolvedValue(editorProvider)
		;(ClineProvider.getActiveEditorInstance as Mock).mockReturnValue(editorProvider)
		vi.clearAllMocks()
		;(vscode.commands.registerCommand as Mock).mockImplementation((_command: string, _callback: unknown) => ({
			dispose: vi.fn(),
		}))
	})

	it("routes sidebar title plus button to the sidebar provider even when an editor tab is visible", async () => {
		registerCommands({ context: mockContext, outputChannel: mockOutputChannel, provider: sidebarProvider })

		await getRegisteredCallback("sidebarPlusButtonClicked")()

		expect(sidebarProvider.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(sidebarProvider.refreshWorkspace).toHaveBeenCalledTimes(1)
		expect(sidebarProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "chatButtonClicked",
		})
		expect(editorProvider.removeClineFromStack).not.toHaveBeenCalled()
	})

	it("routes generic plus button to the active editor provider", async () => {
		registerCommands({ context: mockContext, outputChannel: mockOutputChannel, provider: sidebarProvider })

		await getRegisteredCallback("plusButtonClicked")()

		expect(editorProvider.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(editorProvider.refreshWorkspace).toHaveBeenCalledTimes(1)
		expect(editorProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "chatButtonClicked",
		})
		expect(sidebarProvider.removeClineFromStack).not.toHaveBeenCalled()
	})

	it("routes sidebar title settings button to the sidebar provider instead of the visible editor tab", async () => {
		registerCommands({ context: mockContext, outputChannel: mockOutputChannel, provider: sidebarProvider })

		await getRegisteredCallback("sidebarSettingsButtonClicked")()

		expect(sidebarProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "settingsButtonClicked",
		})
		expect(sidebarProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "didBecomeVisible",
		})
		expect(editorProvider.postMessageToWebview).not.toHaveBeenCalled()
	})

	it("routes generic settings button to the active editor provider", async () => {
		registerCommands({ context: mockContext, outputChannel: mockOutputChannel, provider: sidebarProvider })

		await getRegisteredCallback("settingsButtonClicked")()

		expect(editorProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "settingsButtonClicked",
		})
		expect(editorProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "didBecomeVisible",
		})
	})
})
