import { ModelSelector } from "./chat/ModelSelector"
import KiloModeSelector from "./KiloModeSelector"
import { KiloProfileSelector } from "./chat/KiloProfileSelector"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useSelectedModel } from "../ui/hooks/useSelectedModel"
import type { ProfileType } from "@roo-code/types"

interface BottomApiConfigProps {
	modeShortcutText?: string
	selectApiConfigDisabled?: boolean
}

export const BottomApiConfig = ({ modeShortcutText = "", selectApiConfigDisabled = false }: BottomApiConfigProps) => {
	const {
		currentApiConfigName,
		apiConfiguration,
		virtualQuotaActiveModel,
		mode,
		setMode,
		customModes,
		listApiConfigMeta: listApiConfigMetaUnfilteredByKiloCodeProfileType,
		pinnedApiConfigs,
		togglePinnedApiConfig,
	} = useExtensionState() // kilocode_change: Get virtual quota active model for UI display
	const { id: selectedModelId, provider: selectedProvider } = useSelectedModel(apiConfiguration)

	const listApiConfigMeta = (listApiConfigMetaUnfilteredByKiloCodeProfileType || []).filter((config) => {
		const profileType = (config as { profileType?: ProfileType }).profileType
		return profileType !== "autocomplete"
	})

	const currentConfig = listApiConfigMeta.find((config) => config.name === currentApiConfigName)
	const currentConfigId = currentConfig?.id || ""
	const displayName = currentApiConfigName || ""

	if (!apiConfiguration) {
		return null
	}

	return (
		<div className="flex items-center gap-1 min-w-0 w-full">
			<div className="shrink-0">
				<KiloModeSelector
					value={mode}
					onChange={setMode}
					modeShortcutText={modeShortcutText}
					customModes={customModes}
				/>
			</div>

			<div className="shrink-0">
				<KiloProfileSelector
					currentConfigId={currentConfigId}
					currentApiConfigName={currentApiConfigName}
					displayName={displayName}
					listApiConfigMeta={listApiConfigMeta}
					pinnedApiConfigs={pinnedApiConfigs}
					togglePinnedApiConfig={togglePinnedApiConfig}
					selectApiConfigDisabled={selectApiConfigDisabled}
				/>
			</div>

			{/* kilocode_change - add data-testid="model-selector" below */}
			<div className="shrink-0 overflow-hidden" data-testid="model-selector">
				<ModelSelector
					currentApiConfigName={currentApiConfigName}
					apiConfiguration={apiConfiguration}
					fallbackText={`${selectedProvider}:${selectedModelId}`}
					//kilocode_change: Pass virtual quota active model to ModelSelector
					virtualQuotaActiveModel={
						virtualQuotaActiveModel
							? {
									id: virtualQuotaActiveModel.id,
									name: virtualQuotaActiveModel.id,
									activeProfileNumber: virtualQuotaActiveModel.activeProfileNumber,
								}
							: undefined
					}
				/>
			</div>
		</div>
	)
}
