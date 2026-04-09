import { render, screen, fireEvent, act } from "@/utils/test-utils"

import type { Worktree, WorktreeListResponse } from "@roo-code/types"

import { WorktreeSelector } from "../WorktreeSelector"

const mockPostMessage = vi.fn()

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: (...args: unknown[]) => mockPostMessage(...args),
	},
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/components/ui/hooks/useRooPortal", () => ({
	useRooPortal: () => document.body,
}))

const mockWorktrees: Worktree[] = [
	{
		path: "/path/to/main",
		branch: "main",
		commitHash: "abc123",
		isCurrent: true,
		isBare: true,
		isDetached: false,
		isLocked: false,
	},
	{
		path: "/path/to/feature-branch",
		branch: "feature-branch",
		commitHash: "def456",
		isCurrent: false,
		isBare: false,
		isDetached: false,
		isLocked: false,
	},
	{
		path: "/path/to/another-branch",
		branch: "another-branch",
		commitHash: "ghi789",
		isCurrent: false,
		isBare: false,
		isDetached: false,
		isLocked: false,
	},
]

const simulateWorktreeListMessage = (worktrees: Worktree[], isGitRepo: boolean = true) => {
	const message: Partial<WorktreeListResponse> & { type: string } = {
		type: "worktreeList",
		worktrees,
		isGitRepo,
		isMultiRoot: false,
		isSubfolder: false,
		gitRootPath: "/path/to/repo",
	}

	act(() => {
		window.dispatchEvent(new MessageEvent("message", { data: message }))
	})
}

describe("WorktreeSelector", () => {
	beforeEach(() => {
		mockPostMessage.mockClear()
	})

	test("requests worktrees on mount", () => {
		render(<WorktreeSelector />)
		expect(mockPostMessage).toHaveBeenCalledWith({ type: "listWorktrees" })
	})

	test("does not render when not a git repo", () => {
		const { container } = render(<WorktreeSelector />)
		simulateWorktreeListMessage([], false)
		expect(container.querySelector('[data-testid="worktree-selector-trigger"]')).not.toBeInTheDocument()
	})

	test("does not render when only one worktree exists", () => {
		const { container } = render(<WorktreeSelector />)
		simulateWorktreeListMessage([mockWorktrees[0]])
		expect(container.querySelector('[data-testid="worktree-selector-trigger"]')).not.toBeInTheDocument()
	})

	test("renders trigger when multiple worktrees exist", () => {
		render(<WorktreeSelector />)
		simulateWorktreeListMessage(mockWorktrees)
		expect(screen.getByTestId("worktree-selector-trigger")).toBeInTheDocument()
	})

	test("shows current branch name on trigger", () => {
		render(<WorktreeSelector />)
		simulateWorktreeListMessage(mockWorktrees)
		expect(screen.getByTestId("worktree-selector-trigger")).toHaveTextContent("main")
	})

	test("sends switch message when selecting a different worktree", () => {
		render(<WorktreeSelector />)
		simulateWorktreeListMessage(mockWorktrees)
		fireEvent.click(screen.getByTestId("worktree-selector-trigger"))
		const items = screen.getAllByTestId("worktree-selector-item")
		fireEvent.click(items[1])

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "switchWorktree",
			worktreePath: "/path/to/feature-branch",
			worktreeNewWindow: false,
		})
	})

	test("navigates to worktree settings when settings button clicked", () => {
		render(<WorktreeSelector />)
		simulateWorktreeListMessage(mockWorktrees)
		fireEvent.click(screen.getByTestId("worktree-selector-trigger"))
		const settingsButton = document.querySelector(".codicon-settings-gear")
		expect(settingsButton).toBeInTheDocument()
		fireEvent.click(settingsButton!.closest("button")!)

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: "switchTab",
			tab: "settings",
			values: { section: "worktrees" },
		})
	})

	test("refreshes worktrees when popover opens", () => {
		render(<WorktreeSelector />)
		simulateWorktreeListMessage(mockWorktrees)
		mockPostMessage.mockClear()
		fireEvent.click(screen.getByTestId("worktree-selector-trigger"))
		expect(mockPostMessage).toHaveBeenCalledWith({ type: "listWorktrees" })
	})

	test("handles worktree with no branch", () => {
		const worktreesWithDetached: Worktree[] = [
			...mockWorktrees,
			{
				path: "/path/to/detached",
				branch: "",
				commitHash: "xyz999",
				isCurrent: false,
				isBare: false,
				isDetached: true,
				isLocked: false,
			},
		]

		render(<WorktreeSelector />)
		simulateWorktreeListMessage(worktreesWithDetached)
		fireEvent.click(screen.getByTestId("worktree-selector-trigger"))
		expect(screen.getByText("worktrees:noBranch")).toBeInTheDocument()
	})
})
