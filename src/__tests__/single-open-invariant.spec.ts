// npx vitest run __tests__/single-open-invariant.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { ClineProvider } from "../core/webview/ClineProvider"
import { API } from "../extension/api"
import * as ProfileValidatorMod from "../shared/ProfileValidator"
import { webviewMessageHandler } from "../core/webview/webviewMessageHandler"

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		get instance() {
			return {
				updateIdentity: vi.fn().mockResolvedValue(undefined),
				captureTitleButtonClicked: vi.fn(),
				captureModeSwitch: vi.fn(),
			}
		},
	},
}))

// Mock Task class used by ClineProvider to avoid heavy startup
vi.mock("../core/task/Task", () => {
	class TaskStub {
		public taskId: string
		public instanceId = "inst"
		public parentTask?: any
		public apiConfiguration: any
		public rootTask?: any
		public enableBridge?: boolean
		constructor(opts: any) {
			this.taskId = opts.historyItem?.id ?? `task-${Math.random().toString(36).slice(2, 8)}`
			this.parentTask = opts.parentTask
			this.apiConfiguration = opts.apiConfiguration ?? { apiProvider: "anthropic" }
			opts.onCreated?.(this)
		}
		on() {}
		off() {}
		emit() {}
	}
	return { Task: TaskStub }
})

describe("Single-open-task invariant", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it("User-initiated create: closes existing before opening new", async () => {
		// Allow profile
		vi.spyOn(ProfileValidatorMod.ProfileValidator, "isProfileAllowed").mockReturnValue(true)

		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const addClineToStack = vi.fn().mockResolvedValue(undefined)

		const provider = {
			// Simulate an existing task present in stack
			clineStack: [{ taskId: "existing-1" }],
			setValues: vi.fn(),
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
				organizationAllowList: "*",
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1.0,
				cloudUserInfo: null,
				remoteControlEnabled: false,
			}),
			removeClineFromStack,
			addClineToStack,
			setProviderProfile: vi.fn(),
			log: vi.fn(),
			getStateToPostToWebview: vi.fn(),
			providerSettingsManager: { getModeConfigId: vi.fn(), listConfig: vi.fn() },
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			taskCreationCallback: vi.fn(),
			contextProxy: {
				extensionUri: {},
				setValue: vi.fn(),
				getValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
		} as unknown as ClineProvider

		await (ClineProvider.prototype as any).createTask.call(provider, "New task")

		expect(removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(addClineToStack).toHaveBeenCalledTimes(1)
	})

	it("History resume path always closes current before rehydration (non-rehydrating case)", async () => {
		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const updateGlobalState = vi.fn().mockResolvedValue(undefined)

		const provider = {
			getCurrentTask: vi.fn(() => undefined), // ensure not rehydrating
			removeClineFromStack,
			addClineToStack,
			updateGlobalState,
			log: vi.fn(),
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			providerSettingsManager: {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			},
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1.0,
				experiments: {},
				cloudUserInfo: null,
				taskSyncEnabled: false,
			}),
			// Methods used by createTaskWithHistoryItem for pending edit cleanup
			getPendingEditOperation: vi.fn().mockReturnValue(undefined),
			clearPendingEditOperation: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				getValue: vi.fn(),
				setValue: vi.fn(),
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
			postStateToWebview: vi.fn(),
		} as unknown as ClineProvider

		const historyItem = {
			id: "hist-1",
			number: 1,
			ts: Date.now(),
			task: "Task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			workspace: "/tmp",
		}

		const task = await (ClineProvider.prototype as any).createTaskWithHistoryItem.call(provider, historyItem)
		expect(task).toBeTruthy()
		expect(removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(addClineToStack).toHaveBeenCalledTimes(1)
	})

	it("IPC StartNewTask path closes current before new task", async () => {
		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const createTask = vi.fn().mockResolvedValue({ taskId: "ipc-1" })
		const provider = {
			context: {} as any,
			removeClineFromStack,
			postStateToWebview: vi.fn(),
			postMessageToWebview: vi.fn(),
			createTask,
			getValues: vi.fn(() => ({})),
			providerSettingsManager: { saveConfig: vi.fn() },
			on: vi.fn((ev: any, cb: any) => {
				if (ev === "taskCreated") {
					// no-op for this test
				}
				return provider
			}),
		} as unknown as ClineProvider

		const output = { appendLine: vi.fn() } as any
		const api = new API(output, provider, undefined, false)

		const taskId = await api.startNewTask({
			configuration: {},
			text: "hello",
			images: undefined,
			newTab: false,
		})

		expect(taskId).toBe("ipc-1")
		expect(removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(createTask).toHaveBeenCalled()
	})

	it("Editor mode switch keeps mode local to the provider instance", async () => {
		const setValue = vi.fn().mockResolvedValue(undefined)

		const provider = {
			renderContext: "editor",
			localMode: "code",
			localCurrentApiConfigName: "default",
			localApiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
			getCurrentTask: vi.fn(() => undefined),
			updateGlobalState: vi.fn().mockResolvedValue(undefined),
			emit: vi.fn(),
			log: vi.fn(),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			providerSettingsManager: {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
				setModeConfig: vi.fn(),
			},
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			contextProxy: {
				getValue: vi.fn((key: string) => (key === "taskHistory" ? [] : undefined)),
				setValue,
				getValues: vi.fn().mockReturnValue({ mode: "code", currentApiConfigName: "default" }),
				getProviderSettings: vi.fn().mockReturnValue({ apiProvider: "anthropic", consecutiveMistakeLimit: 0 }),
				setProviderSettings: vi.fn(),
			},
		} as unknown as ClineProvider

		await (ClineProvider.prototype as any).handleModeSwitch.call(provider, "architect")

		expect((provider as any).localMode).toBe("architect")
		expect(setValue).not.toHaveBeenCalledWith("mode", "architect")
		expect(provider.providerSettingsManager.setModeConfig).not.toHaveBeenCalled()
	})

	it("Editor provider profile activation keeps current profile local to the provider instance", async () => {
		const setValue = vi.fn().mockResolvedValue(undefined)
		const setProviderSettings = vi.fn().mockResolvedValue(undefined)

		const provider = {
			renderContext: "editor",
			localMode: "code",
			localCurrentApiConfigName: "default",
			localApiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
			getCurrentTask: vi.fn(() => undefined),
			getState: vi.fn().mockResolvedValue({ mode: "code" }),
			updateGlobalState: vi.fn().mockResolvedValue(undefined),
			updateTaskApiHandlerIfNeeded: vi.fn(),
			persistStickyProviderProfileToCurrentTask: vi.fn().mockResolvedValue(undefined),
			emit: vi.fn(),
			log: vi.fn(),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			providerSettingsManager: {
				getProfile: vi.fn().mockResolvedValue({
					name: "alt",
					id: "cfg-2",
					apiProvider: "openrouter",
					openRouterApiKey: "token",
				}),
				listConfig: vi.fn().mockResolvedValue([{ name: "alt", id: "cfg-2", apiProvider: "openrouter" }]),
				setModeConfig: vi.fn(),
			},
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			contextProxy: {
				getValue: vi.fn(),
				setValue,
				getValues: vi.fn().mockReturnValue({ mode: "code", currentApiConfigName: "default" }),
				getProviderSettings: vi.fn().mockReturnValue({ apiProvider: "anthropic", consecutiveMistakeLimit: 0 }),
				setProviderSettings,
			},
		} as unknown as ClineProvider

		await (ClineProvider.prototype as any).activateProviderProfile.call(provider, { name: "alt" })

		expect((provider as any).localCurrentApiConfigName).toBe("alt")
		expect((provider as any).localApiConfiguration.apiProvider).toBe("openrouter")
		expect(setValue).not.toHaveBeenCalledWith("currentApiConfigName", "alt")
		expect(setProviderSettings).not.toHaveBeenCalled()
		expect(provider.providerSettingsManager.setModeConfig).not.toHaveBeenCalled()
	})

	it("Editor history restore keeps restored mode local to the provider instance", async () => {
		const removeClineFromStack = vi.fn().mockResolvedValue(undefined)
		const addClineToStack = vi.fn().mockResolvedValue(undefined)
		const setValue = vi.fn().mockResolvedValue(undefined)

		const provider = {
			renderContext: "editor",
			localMode: "code",
			localCurrentApiConfigName: "default",
			localApiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
			getCurrentTask: vi.fn(() => undefined),
			removeClineFromStack,
			addClineToStack,
			updateGlobalState: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			providerSettingsManager: {
				getModeConfigId: vi.fn().mockResolvedValue(undefined),
				listConfig: vi.fn().mockResolvedValue([]),
			},
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
				diffEnabled: false,
				enableCheckpoints: true,
				checkpointTimeout: 60,
				fuzzyMatchThreshold: 1.0,
				experiments: {},
				cloudUserInfo: null,
				taskSyncEnabled: false,
			}),
			getPendingEditOperation: vi.fn().mockReturnValue(undefined),
			clearPendingEditOperation: vi.fn(),
			context: { extension: { packageJSON: {} }, globalStorageUri: { fsPath: "/tmp" } },
			contextProxy: {
				extensionUri: {},
				getValue: vi.fn(),
				setValue,
				setProviderSettings: vi.fn(),
				getProviderSettings: vi.fn(() => ({})),
			},
			postStateToWebview: vi.fn(),
		} as unknown as ClineProvider

		const historyItem = {
			id: "hist-editor",
			number: 1,
			ts: Date.now(),
			task: "Task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			workspace: "/tmp",
			mode: "architect",
		}

		await (ClineProvider.prototype as any).createTaskWithHistoryItem.call(provider, historyItem)

		expect((provider as any).localMode).toBe("architect")
		expect(setValue).not.toHaveBeenCalledWith("mode", "architect")
		expect(removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(addClineToStack).toHaveBeenCalledTimes(1)
	})

	// kilocode_change start: editor-local profile saves must use provider-local active state
	it("Editor profile save refreshes the provider-local active profile even when global state points elsewhere", async () => {
		const upsertProviderProfile = vi.fn().mockResolvedValue(undefined)

		const provider = {
			renderContext: "editor",
			getState: vi.fn().mockResolvedValue({ currentApiConfigName: "alt" }),
			upsertProviderProfile,
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
			providerSettingsManager: {
				getProfile: vi.fn().mockRejectedValue(new Error("profile not found in test")),
			},
			contextProxy: {
				getValue: vi.fn((key: string) => (key === "currentApiConfigName" ? "default" : undefined)),
			},
		} as unknown as ClineProvider

		await webviewMessageHandler(provider, {
			type: "upsertApiConfiguration",
			text: "alt",
			apiConfiguration: {
				apiProvider: "anthropic",
				apiModelId: "claude-3-7-sonnet-20250219",
			},
		} as any)

		expect(upsertProviderProfile).toHaveBeenCalledWith(
			"alt",
			expect.objectContaining({
				apiProvider: "anthropic",
				apiModelId: "claude-3-7-sonnet-20250219",
			}),
			true,
		)
	})
	// kilocode_change end
})
