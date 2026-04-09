/**
 * WorktreeIncludeService
 *
 * Platform-agnostic service for handling .worktreeinclude files.
 * Used to copy untracked files when creating worktrees.
 */

import { execFile, spawn } from "child_process"
import * as fs from "fs/promises"
import * as path from "path"
import { promisify } from "util"

import ignore, { type Ignore } from "ignore"

import type { WorktreeIncludeStatus } from "@roo-code/types"

/**
 * Progress info for copy tracking.
 * Shows activity without trying to predict total size.
 */
export interface CopyProgress {
	/** Current bytes copied */
	bytesCopied: number
	/** Name of current item being copied */
	itemName: string
}

/**
 * Callback for reporting copy progress during worktree file copying.
 */
export type CopyProgressCallback = (progress: CopyProgress) => void

const execFileAsync = promisify(execFile)

/**
 * Service for managing .worktreeinclude files and copying files to new worktrees.
 * All methods are platform-agnostic and don't depend on VSCode APIs.
 */
export class WorktreeIncludeService {
	/**
	 * Check if .worktreeinclude exists in a directory.
	 */
	async hasWorktreeInclude(dir: string): Promise<boolean> {
		try {
			await fs.access(path.join(dir, ".worktreeinclude"))
			return true
		} catch {
			return false
		}
	}

	/**
	 * Check if a specific branch has .worktreeinclude file in git.
	 */
	async branchHasWorktreeInclude(cwd: string, branch: string): Promise<boolean> {
		try {
			const ref = `${branch}:.worktreeinclude`
			await execFileAsync("git", ["cat-file", "-e", "--", ref], { cwd })
			return true
		} catch {
			return false
		}
	}

	/**
	 * Get the status of .worktreeinclude and .gitignore.
	 */
	async getStatus(dir: string): Promise<WorktreeIncludeStatus> {
		const worktreeIncludePath = path.join(dir, ".worktreeinclude")
		const gitignorePath = path.join(dir, ".gitignore")

		let exists = false
		let hasGitignore = false
		let gitignoreContent: string | undefined

		try {
			await fs.access(worktreeIncludePath)
			exists = true
		} catch {
			exists = false
		}

		try {
			gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
			hasGitignore = true
		} catch {
			hasGitignore = false
		}

		return {
			exists,
			hasGitignore,
			gitignoreContent,
		}
	}

	/**
	 * Create a .worktreeinclude file with the specified content.
	 */
	async createWorktreeInclude(dir: string, content: string): Promise<void> {
		await fs.writeFile(path.join(dir, ".worktreeinclude"), content, "utf-8")
	}

	/**
	 * Copy files matching .worktreeinclude patterns from source to target.
	 * Only copies files that are also in .gitignore.
	 */
	async copyWorktreeIncludeFiles(
		sourceDir: string,
		targetDir: string,
		onProgress?: CopyProgressCallback,
	): Promise<string[]> {
		const worktreeIncludePath = path.join(sourceDir, ".worktreeinclude")
		const gitignorePath = path.join(sourceDir, ".gitignore")

		let hasWorktreeInclude = false
		let hasGitignore = false

		try {
			await fs.access(worktreeIncludePath)
			hasWorktreeInclude = true
		} catch {
			hasWorktreeInclude = false
		}

		try {
			await fs.access(gitignorePath)
			hasGitignore = true
		} catch {
			hasGitignore = false
		}

		if (!hasWorktreeInclude || !hasGitignore) {
			return []
		}

		const worktreeIncludePatterns = await this.parseIgnoreFile(worktreeIncludePath)
		const gitignorePatterns = await this.parseIgnoreFile(gitignorePath)

		if (worktreeIncludePatterns.length === 0 || gitignorePatterns.length === 0) {
			return []
		}

		const worktreeIncludeMatcher = ignore().add(worktreeIncludePatterns)
		const gitignoreMatcher = ignore().add(gitignorePatterns)

		const itemsToCopy = await this.findMatchingItems(sourceDir, worktreeIncludeMatcher, gitignoreMatcher)

		if (itemsToCopy.length === 0) {
			return []
		}

		let bytesCopied = 0

		if (onProgress && itemsToCopy.length > 0) {
			onProgress({ bytesCopied: 0, itemName: itemsToCopy[0]! })
		}

		const copiedItems: string[] = []
		for (const item of itemsToCopy) {
			const sourcePath = path.join(sourceDir, item)
			const targetPath = path.join(targetDir, item)

			try {
				const stats = await fs.stat(sourcePath)

				if (stats.isDirectory()) {
					bytesCopied = await this.copyDirectoryWithProgress(
						sourcePath,
						targetPath,
						item,
						bytesCopied,
						onProgress,
					)
				} else {
					onProgress?.({ bytesCopied, itemName: item })
					await fs.mkdir(path.dirname(targetPath), { recursive: true })
					await fs.copyFile(sourcePath, targetPath)
					bytesCopied += this.getSizeOnDisk(stats)
				}

				copiedItems.push(item)
				onProgress?.({ bytesCopied, itemName: item })
			} catch (error) {
				console.error(`Failed to copy ${item}:`, error)
			}
		}

		return copiedItems
	}

	private getSizeOnDisk(stats: { size: number; blksize?: number }): number {
		if (stats.blksize !== undefined && stats.blksize > 0) {
			return stats.blksize * Math.ceil(stats.size / stats.blksize)
		}
		return stats.size
	}

	private async getPathSize(targetPath: string): Promise<number> {
		try {
			const stats = await fs.stat(targetPath)

			if (stats.isFile()) {
				return this.getSizeOnDisk(stats)
			}

			if (stats.isDirectory()) {
				return await this.getDirectorySizeRecursive(targetPath)
			}

			return 0
		} catch {
			return 0
		}
	}

	private async getDirectorySizeRecursive(dirPath: string): Promise<number> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true })
			const sizes = await Promise.all(
				entries.map(async (entry) => {
					const entryPath = path.join(dirPath, entry.name)
					try {
						if (entry.isFile()) {
							const stats = await fs.stat(entryPath)
							return this.getSizeOnDisk(stats)
						} else if (entry.isDirectory()) {
							return await this.getDirectorySizeRecursive(entryPath)
						}
						return 0
					} catch {
						return 0
					}
				}),
			)
			return sizes.reduce((sum, size) => sum + size, 0)
		} catch {
			return 0
		}
	}

	private async getCurrentDirectorySize(dirPath: string): Promise<number> {
		try {
			await fs.access(dirPath)
			return await this.getDirectorySizeRecursive(dirPath)
		} catch {
			return 0
		}
	}

	private async copyDirectoryWithProgress(
		source: string,
		target: string,
		itemName: string,
		bytesCopiedBefore: number,
		onProgress?: CopyProgressCallback,
	): Promise<number> {
		await fs.mkdir(path.dirname(target), { recursive: true })

		const isWindows = process.platform === "win32"

		const copyPromise = new Promise<void>((resolve, reject) => {
			let proc: ReturnType<typeof spawn>

			if (isWindows) {
				proc = spawn("robocopy", [source, target, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"], {
					windowsHide: true,
				})
			} else {
				proc = spawn("cp", ["-r", "--", source, target])
			}

			proc.on("close", (code) => {
				if (isWindows) {
					if (code !== null && code < 8) {
						resolve()
					} else {
						reject(new Error(`robocopy failed with code ${code}`))
					}
				} else if (code === 0) {
					resolve()
				} else {
					reject(new Error(`cp failed with code ${code}`))
				}
			})

			proc.on("error", reject)
		})

		const pollInterval = 500
		let polling = true

		const pollProgress = async () => {
			while (polling) {
				const currentSize = await this.getCurrentDirectorySize(target)
				const totalCopied = bytesCopiedBefore + currentSize

				onProgress?.({
					bytesCopied: totalCopied,
					itemName,
				})

				await new Promise((resolve) => setTimeout(resolve, pollInterval))
			}
		}

		const pollPromise = pollProgress()

		try {
			await copyPromise
		} finally {
			polling = false
			await pollPromise.catch(() => {})
		}

		const finalSize = await this.getPathSize(target)
		return bytesCopiedBefore + finalSize
	}

	private async parseIgnoreFile(filePath: string): Promise<string[]> {
		try {
			const content = await fs.readFile(filePath, "utf-8")
			return content
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith("#"))
		} catch {
			return []
		}
	}

	private async findMatchingItems(
		sourceDir: string,
		includeMatcher: Ignore,
		gitignoreMatcher: Ignore,
	): Promise<string[]> {
		const matchingItems: string[] = []

		try {
			const entries = await fs.readdir(sourceDir, { withFileTypes: true })

			for (const entry of entries) {
				const relativePath = entry.name

				if (relativePath === ".git") continue

				const matchesWorktreeInclude = includeMatcher.ignores(relativePath)
				const matchesGitignore = gitignoreMatcher.ignores(relativePath)

				if (matchesWorktreeInclude && matchesGitignore) {
					matchingItems.push(relativePath)
				}
			}
		} catch {
			return []
		}

		return matchingItems
	}
}

export const worktreeIncludeService = new WorktreeIncludeService()
