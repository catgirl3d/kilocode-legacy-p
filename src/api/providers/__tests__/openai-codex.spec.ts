// npx vitest run api/providers/__tests__/openai-codex.spec.ts

import { OpenAiCodexHandler } from "../openai-codex"

describe("OpenAiCodexHandler.getModel", () => {
	it.each(["gpt-5.1", "gpt-5", "gpt-5.1-codex", "gpt-5-codex", "gpt-5-codex-mini", "gpt-5.5"])(
		"should return specified model when a valid model id is provided: %s",
		(apiModelId) => {
			const handler = new OpenAiCodexHandler({ apiModelId })
			const model = handler.getModel()

			expect(model.id).toBe(apiModelId)
			expect(model.info).toBeDefined()
			// Default reasoning effort for GPT-5 family
			expect(model.info.reasoningEffort).toBe("medium")
		},
	)

	it("should return GPT-5.4 model info with verbosity", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.4" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.4")
		expect(model.info.contextWindow).toBe(1000000)
		expect(model.info.supportsVerbosity).toBe(true)
		expect(model.info.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh"])
		expect(model.info.reasoningEffort).toBe("medium")
	})

	it("should return GPT-5.4 Mini model info with verbosity", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.4-mini" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.4-mini")
		expect(model.info.contextWindow).toBe(400000)
		expect(model.info.supportsVerbosity).toBe(true)
		expect(model.info.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh"])
		expect(model.info.reasoningEffort).toBe("medium")
	})

	it("should return GPT-5.5 model info with verbosity", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.5" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.5")
		expect(model.info.contextWindow).toBe(400000)
		expect(model.info.supportsVerbosity).toBe(true)
		expect(model.info.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh"])
		expect(model.info.reasoningEffort).toBe("medium")
	})

	it("should fall back to default model when an invalid model id is provided", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "not-a-real-model" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.3-codex")
		expect(model.info).toBeDefined()
	})
})
