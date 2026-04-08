import React, { useMemo, useState, useEffect } from "react"
import { SelectDropdown, DropdownOptionType, type DropdownOption } from "@/components/ui"
import { IconProps } from "@radix-ui/react-icons/dist/types" // kilocode_change: Import IconProps for correct typing
import { OPENROUTER_DEFAULT_PROVIDER_NAME, type ProviderSettings } from "@roo-code/types"
import { vscode } from "@src/utils/vscode"
import { OCAModelService } from "@src/services/OCAModelService"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { cn } from "@src/lib/utils"
import { prettyModelName } from "../../../utils/prettyModelName"
import { useProviderModels } from "../hooks/useProviderModels"
import { getModelIdKey, getSelectedModelId } from "../hooks/useSelectedModel"
import { useGroupedModelIds } from "@/components/ui/hooks/kilocode/usePreferredModels"
import OcaAcknowledgeModal from "../common/OcaAcknowledgeModal"

interface ModelSelectorProps {
	currentApiConfigName?: string
	apiConfiguration: ProviderSettings
	fallbackText: string
	virtualQuotaActiveModel?: { id: string; name: string; activeProfileNumber?: number } // kilocode_change: Add virtual quota active model for UI display
}

// kilocode_change start - Model Icon
const ModelIcon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => (
	<svg
		id="svg"
		ref={ref}
		xmlns="http://www.w3.org/2000/svg"
		width="400"
		height="400"
		viewBox="0, 0, 400,400"
		{...props}>
		<g id="svgg">
			<path
				id="path0"
				d="M121.875 1.593 C 101.252 6.896,78.975 30.339,78.901 46.817 C 78.897 47.696,77.283 48.435,73.237 49.408 C 51.197 54.708,32.859 72.415,25.656 95.351 C 22.790 104.479,22.999 125.020,26.052 134.194 L 28.202 140.654 22.100 146.699 C -8.245 176.760,-7.383 227.825,23.933 255.294 L 28.278 259.105 26.090 265.686 C 22.998 274.985,22.770 295.459,25.656 304.649 C 32.825 327.478,51.390 345.409,73.237 350.607 C 77.289 351.571,78.897 352.302,78.901 353.183 C 78.949 363.934,93.913 384.799,107.031 392.407 C 140.500 411.819,184.359 393.373,193.761 355.930 C 195.923 347.317,196.225 54.866,194.081 45.076 C 187.219 13.739,153.532 -6.548,121.875 1.593 M247.445 1.438 C 245.647 2.623,228.169 25.563,220.791 36.422 L 218.750 39.425 218.755 110.142 C 218.761 188.861,218.373 183.129,223.939 186.799 C 226.977 188.802,233.960 188.802,236.999 186.799 C 242.302 183.302,242.177 184.208,242.182 149.414 L 242.188 117.969 277.617 117.969 L 313.047 117.969 316.094 115.708 C 317.770 114.464,323.354 109.191,328.503 103.989 L 337.866 94.531 353.503 94.526 C 373.387 94.520,376.552 92.911,376.552 82.813 C 376.552 72.157,374.021 71.105,348.359 71.099 L 327.578 71.094 324.531 73.355 C 322.855 74.598,317.271 79.872,312.122 85.073 L 302.759 94.531 272.473 94.531 L 242.188 94.531 242.188 71.469 L 242.188 48.408 251.328 35.923 L 260.468 23.437 266.953 23.438 L 273.438 23.438 273.443 43.555 C 273.449 68.468,274.562 71.083,285.156 71.083 C 295.750 71.083,296.863 68.468,296.870 43.555 L 296.875 23.438 304.041 23.438 L 311.207 23.438 322.205 34.257 C 335.625 47.460,335.908 47.658,341.385 47.651 C 350.789 47.640,356.836 37.130,351.753 29.632 C 350.129 27.237,325.450 3.201,322.678 1.314 C 319.596 -0.783,250.641 -0.670,247.445 1.438 M151.017 27.147 C 161.863 32.242,169.520 42.774,171.072 54.730 C 171.501 58.037,171.837 87.616,171.851 123.288 L 171.875 186.029 167.208 183.542 C 157.131 178.171,150.637 168.204,149.128 155.795 C 147.822 145.047,144.682 141.406,136.719 141.406 C 118.773 141.406,121.506 173.229,141.223 193.867 L 147.082 200.000 141.223 206.133 C 121.506 226.771,118.773 258.594,136.719 258.594 C 144.682 258.594,147.822 254.953,149.128 244.205 C 150.637 231.796,157.131 221.829,167.208 216.458 L 171.875 213.971 171.851 276.712 C 171.837 312.384,171.501 341.963,171.072 345.270 C 166.679 379.120,121.148 387.202,105.773 356.860 C 103.253 351.888,103.346 351.720,109.793 349.656 C 129.426 343.371,137.449 333.735,131.039 324.139 C 126.860 317.884,121.042 317.298,111.668 322.187 C 72.077 342.836,32.210 303.658,53.316 264.844 C 59.075 254.253,57.922 249.509,47.979 242.888 C 6.860 215.509,21.610 155.142,70.701 149.898 C 82.346 148.654,85.943 145.698,85.932 137.379 C 85.918 125.579,74.971 122.702,52.200 128.515 C 49.383 129.234,47.656 123.743,47.656 114.062 C 47.656 91.225,64.525 73.713,88.642 71.512 C 98.322 70.629,101.007 67.569,102.317 55.924 C 105.049 31.628,129.634 17.101,151.017 27.147 M346.595 131.170 C 342.929 133.587,341.417 136.595,341.411 141.484 C 341.405 147.225,342.156 148.199,361.247 167.180 L 376.563 182.407 376.563 207.814 L 376.563 233.220 363.200 246.493 C 346.200 263.379,345.311 264.559,345.318 270.234 C 345.329 279.624,355.777 285.735,363.303 280.753 C 366.135 278.878,395.086 250.132,397.737 246.562 L 400.000 243.516 400.000 207.869 C 400.000 176.171,399.858 172.009,398.722 170.291 C 396.852 167.466,364.204 134.610,360.625 131.951 C 356.836 129.137,350.236 128.769,346.595 131.170 M274.720 150.701 C 268.973 154.490,267.603 162.795,271.794 168.437 C 274.445 172.007,303.397 200.753,306.229 202.628 C 309.329 204.680,340.866 204.510,344.030 202.424 C 351.169 197.717,351.169 186.658,344.030 181.951 C 342.093 180.674,340.241 180.478,330.070 180.474 L 318.342 180.469 305.070 167.106 C 286.268 148.178,282.026 145.885,274.720 150.701 M223.939 213.201 C 218.361 216.878,218.760 210.672,218.760 293.750 C 218.760 365.025,218.825 368.457,220.205 370.551 C 222.103 373.429,221.230 372.880,246.979 387.392 C 275.955 403.724,271.203 403.575,297.177 388.961 C 329.093 371.004,328.130 371.783,328.120 363.942 C 328.112 357.856,327.206 356.899,307.524 342.178 L 289.778 328.906 285.319 328.911 C 277.743 328.920,273.452 333.109,273.443 340.504 C 273.435 346.376,274.768 348.136,284.863 355.588 C 289.722 359.175,293.706 362.285,293.717 362.500 C 293.729 362.715,289.169 365.455,283.586 368.590 L 273.434 374.290 257.816 365.465 L 242.199 356.641 242.193 323.242 L 242.188 289.844 250.195 289.839 C 261.646 289.831,265.615 286.816,265.615 278.125 C 265.615 269.434,261.646 266.419,250.195 266.411 L 242.188 266.406 242.188 250.781 L 242.188 235.156 254.102 235.151 C 269.843 235.144,273.427 232.972,273.427 223.438 C 273.427 212.860,270.786 211.729,246.094 211.729 C 227.889 211.729,225.979 211.856,223.939 213.201 M302.064 228.826 C 296.708 232.357,296.885 230.937,296.885 270.313 C 296.885 302.982,296.997 306.029,298.265 307.952 C 299.445 309.741,340.613 343.601,349.531 350.117 C 353.175 352.780,360.003 353.250,363.303 351.065 C 366.135 349.190,395.086 320.444,397.737 316.875 C 403.892 308.587,398.509 297.674,388.260 297.661 C 382.725 297.655,382.546 297.782,367.969 312.151 L 355.859 324.087 338.086 309.673 L 320.313 295.260 320.307 265.013 C 320.301 228.622,319.907 227.354,308.594 227.354 C 305.695 227.354,303.570 227.833,302.064 228.826 "
				stroke="none"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</g>
	</svg>
))
// kilocode_change end

export const ModelSelector = ({
	currentApiConfigName,
	apiConfiguration,
	fallbackText,
	virtualQuotaActiveModel, //kilocode_change
}: ModelSelectorProps) => {
	const { t } = useAppTranslation()
	const { provider, providerModels, providerDefaultModel, isLoading, isError } = useProviderModels(apiConfiguration)
	const selectedModelId = getSelectedModelId({
		provider,
		apiConfiguration,
		defaultModelId: providerDefaultModel,
	})
	const modelIdKey = getModelIdKey({ provider })
	const isAutocomplete = apiConfiguration.profileType === "autocomplete"

	const { preferredModelIds, restModelIds } = useGroupedModelIds(providerModels)
	const [ackOpen, setAckOpen] = useState(false)
	const [pendingModelId, setPendingModelId] = useState<string | null>(null)
	const bannerHtml = pendingModelId ? (providerModels as any)?.[pendingModelId]?.banner : undefined

	const options = useMemo(() => {
		const result: DropdownOption[] = []

		// Check if selected model is missing from the lists
		const allModelIds = [...preferredModelIds, ...restModelIds]
		const isMissingSelectedModel = selectedModelId && !allModelIds.includes(selectedModelId)

		// Add "Recommended models" section if there are preferred models
		if (preferredModelIds.length > 0) {
			result.push({
				value: "__label_recommended__",
				label: t("settings:modelPicker.recommendedModels"),
				type: DropdownOptionType.LABEL,
			})

			preferredModelIds.forEach((modelId) => {
				result.push({
					value: modelId,
					label: providerModels[modelId]?.displayName ?? prettyModelName(modelId),
					type: DropdownOptionType.ITEM,
				})
			})
		}

		// Add "All models" section
		if (restModelIds.length > 0) {
			result.push({
				value: "__label_all__",
				label: t("settings:modelPicker.allModels"),
				type: DropdownOptionType.LABEL,
			})

			// Add missing selected model at the top of "All models" if not in any list
			if (isMissingSelectedModel) {
				result.push({
					value: selectedModelId,
					label: providerModels[selectedModelId]?.displayName ?? prettyModelName(selectedModelId),
					type: DropdownOptionType.ITEM,
				})
			}

			restModelIds.forEach((modelId) => {
				result.push({
					value: modelId,
					label: providerModels[modelId]?.displayName ?? prettyModelName(modelId),
					type: DropdownOptionType.ITEM,
				})
			})
		} else if (isMissingSelectedModel) {
			// If there are no rest models but we have a missing selected model, add it
			result.push({
				value: selectedModelId,
				label: providerModels[selectedModelId]?.displayName ?? prettyModelName(selectedModelId),
				type: DropdownOptionType.ITEM,
			})
		}

		return result
	}, [preferredModelIds, restModelIds, providerModels, selectedModelId, t])

	const disabled = isLoading || isError || isAutocomplete

	useEffect(() => {
		if (provider !== "oca") return
		try {
			OCAModelService.setOcaModels(providerModels as any)
		} catch (err) {
			console.debug("ModelSelector: failure setting OCA models", err)
		}

		const saved = OCAModelService.getOcaSelectedModelId()
		const first = Object.keys(providerModels || {})[0]
		const target = saved || first

		if (!target || !currentApiConfigName) return
		if (selectedModelId === target || !providerModels[target]) return

		vscode.postMessage({
			type: "upsertApiConfiguration",
			text: currentApiConfigName,
			apiConfiguration: {
				...apiConfiguration,
				[getModelIdKey({ provider })]: target,
				openRouterSpecificProvider: OPENROUTER_DEFAULT_PROVIDER_NAME,
			},
		})
		try {
			OCAModelService.setOcaSelectedModelId(target)
		} catch (err) {
			console.debug("ModelSelector: failure setting selected OCA model", err)
		}
	}, [provider, providerModels, selectedModelId, currentApiConfigName, apiConfiguration])

	const onChange = (value: string) => {
		if (!currentApiConfigName) {
			return
		}
		if (apiConfiguration[modelIdKey] === value) {
			// don't reset openRouterSpecificProvider
			return
		}
		if (provider === "oca" && (providerModels as any)?.[value]?.banner) {
			setPendingModelId(value)
			setAckOpen(true)
			return
		}
		if (provider === "oca") {
			try {
				OCAModelService.setOcaSelectedModelId(value)
			} catch (err) {
				console.debug("ModelSelector: failure setting selected OCA model on change", err)
			}
		}
		vscode.postMessage({
			type: "upsertApiConfiguration",
			text: currentApiConfigName,
			apiConfiguration: {
				...apiConfiguration,
				[modelIdKey]: value,
				openRouterSpecificProvider: OPENROUTER_DEFAULT_PROVIDER_NAME,
			},
		})
	}

	const onAcknowledge = () => {
		if (!currentApiConfigName || !pendingModelId || apiConfiguration[modelIdKey] === pendingModelId) {
			setAckOpen(false)
			setPendingModelId(null)
			return
		}
		vscode.postMessage({
			type: "upsertApiConfiguration",
			text: currentApiConfigName,
			apiConfiguration: {
				...apiConfiguration,
				[modelIdKey]: pendingModelId,
				openRouterSpecificProvider: OPENROUTER_DEFAULT_PROVIDER_NAME,
			},
		})
		try {
			if (provider === "oca") {
				OCAModelService.setOcaSelectedModelId(pendingModelId)
			}
		} catch (err) {
			console.debug("ModelSelector: failure setting selected OCA model on acknowledge", err)
		}
		setAckOpen(false)
		setPendingModelId(null)
	}

	if (isLoading) {
		return null
	}

	// kilocode_change start: Display active model for virtual quota fallback
	if (provider === "virtual-quota-fallback" && virtualQuotaActiveModel) {
		return (
			<span className="text-xs text-vscode-descriptionForeground opacity-70 truncate">
				{prettyModelName(virtualQuotaActiveModel.id)}
				{virtualQuotaActiveModel.activeProfileNumber !== undefined && (
					<> ({virtualQuotaActiveModel.activeProfileNumber})</>
				)}
			</span>
		)
	}
	// kilocode_change end

	if (isError || isAutocomplete || options.length <= 0) {
		return <span className="text-xs text-vscode-descriptionForeground opacity-70 truncate">{fallbackText}</span>
	}

	return (
		<>
			<OcaAcknowledgeModal
				open={ackOpen}
				bannerHtml={bannerHtml ?? undefined}
				onAcknowledge={onAcknowledge}
				onCancel={() => {
					setAckOpen(false)
					setPendingModelId(null)
				}}
			/>
			<SelectDropdown
				value={selectedModelId}
				disabled={disabled}
				title={t("chat:selectApiConfig")}
				options={options}
				onChange={onChange}
				contentClassName="max-h-[400px] overflow-y-auto"
				triggerClassName={cn(
					"text-ellipsis overflow-hidden px-1.5 py-1", // kilocode_change: add padding for border
					"bg-[var(--background)] border-[var(--vscode-input-border)] hover:bg-[var(--color-vscode-list-hoverBackground)]", // kilocode_change: add border/bg
				)}
				triggerIcon={ModelIcon} // kilocode_change: add custom model icon
				itemClassName="group"
			/>
		</>
	)
}
