<script lang="ts">
	let {
		name = 'attachment',
		existingUrl = null,
		existingFilename = null,
		onRemove = undefined,
		class: className = ''
	}: {
		name?: string;
		existingUrl?: string | null;
		existingFilename?: string | null;
		onRemove?: (() => void) | undefined;
		class?: string;
	} = $props();

	// State
	let files = $state<FileList | undefined>(undefined);
	let previewUrl = $state<string | null>(null);
	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	// Track previous previewUrl for cleanup
	let previousPreviewUrl: string | null = null;

	// Effect to handle previewUrl updates and cleanup
	$effect(() => {
		// Revoke previous object URL if it exists
		if (previousPreviewUrl && previousPreviewUrl !== previewUrl) {
			URL.revokeObjectURL(previousPreviewUrl);
		}

		// Create new preview URL if files selected
		if (files && files.length > 0) {
			const newUrl = URL.createObjectURL(files[0]);
			previewUrl = newUrl;
			previousPreviewUrl = newUrl;
		} else {
			previewUrl = null;
			previousPreviewUrl = null;
		}

		// Cleanup on unmount
		return () => {
			if (previousPreviewUrl) {
				URL.revokeObjectURL(previousPreviewUrl);
			}
		};
	});

	// Display URL: show preview if selecting new file, else existing
	let displayUrl = $derived(previewUrl || existingUrl);
	let displayFilename = $derived(files && files.length > 0 ? files[0].name : existingFilename);

	// Clear file selection
	function clearSelection() {
		// Reset files using DataTransfer
		const dt = new DataTransfer();
		if (fileInput) {
			fileInput.files = dt.files;
		}
		files = dt.files;
		previewUrl = null;
	}

	// Handle clear/remove button click
	function handleClear() {
		if (previewUrl) {
			// New file selected, just clear it
			clearSelection();
		} else if (existingUrl && onRemove) {
			// Existing attachment, call remove callback
			onRemove();
		}
	}

	// Drag and drop handlers
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			// Validate file type
			if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
				const dt = new DataTransfer();
				dt.items.add(file);
				if (fileInput) {
					fileInput.files = dt.files;
				}
				files = dt.files;
			}
		}
	}

	// Handle file input change
	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		files = input.files || undefined;
	}

	// Click to open file dialog
	function handleClick() {
		fileInput?.click();
	}
</script>

<div class={className}>
	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		{name}
		accept="image/jpeg,image/png,image/webp,image/gif"
		onchange={handleFileChange}
		class="hidden"
	/>

	{#if displayUrl}
		<!-- Preview mode -->
		<div class="relative inline-block">
			<img
				src={displayUrl}
				alt="Attachment preview"
				class="max-h-48 rounded-lg shadow-sm"
			/>
			<!-- Remove/clear button -->
			<button
				type="button"
				onclick={handleClear}
				class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700"
				aria-label="Remove attachment"
			>
				<iconify-icon icon="solar:close-circle-bold" width="16" height="16"></iconify-icon>
			</button>
		</div>
		{#if displayFilename}
			<p class="mt-2 text-sm text-gray-600 truncate max-w-xs">{displayFilename}</p>
		{/if}
	{:else}
		<!-- Upload zone -->
		<button
			type="button"
			onclick={handleClick}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			class="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors
				{dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
		>
			<!-- Plus icon -->
			<iconify-icon icon="solar:cloud-upload-linear" class="text-gray-400" width="40" height="40"></iconify-icon>
			<p class="mt-2 text-sm text-gray-600">Click or drag to upload receipt</p>
			<p class="mt-1 text-xs text-gray-500">JPEG, PNG, WebP, GIF up to 10MB</p>
		</button>
	{/if}
</div>
