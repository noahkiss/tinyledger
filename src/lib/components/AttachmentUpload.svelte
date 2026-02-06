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
		class="is-hidden"
	/>

	{#if displayUrl}
		<!-- Preview mode -->
		<div class="preview-container">
			<figure class="image">
				<img
					src={displayUrl}
					alt="Attachment preview"
					class="preview-image"
				/>
			</figure>
			<!-- Remove/clear button -->
			<button
				type="button"
				onclick={handleClear}
				class="delete remove-button"
				aria-label="Remove attachment"
			></button>
		</div>
		{#if displayFilename}
			<p class="is-size-7 mt-2 filename" style="color: var(--color-muted)">{displayFilename}</p>
		{/if}
	{:else}
		<!-- Upload zone -->
		<button
			type="button"
			onclick={handleClick}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			class="upload-zone"
			class:is-dragover={dragOver}
		>
			<iconify-icon icon="solar:cloud-upload-linear" width="40" height="40" style="color: var(--color-muted)"></iconify-icon>
			<p class="is-size-7 mt-2" style="color: var(--color-muted)">Click or drag to upload receipt</p>
			<p class="is-size-7 mt-1" style="color: var(--color-muted)">JPEG, PNG, WebP, GIF up to 10MB</p>
		</button>
	{/if}
</div>

<style>
	.preview-container {
		position: relative;
		display: inline-block;
	}
	.preview-image {
		max-height: 12rem;
		border-radius: var(--bulma-radius);
	}
	.remove-button {
		position: absolute;
		top: -0.5rem;
		right: -0.5rem;
	}
	.filename {
		max-width: 20rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 1.5rem;
		border: 2px dashed var(--color-input-border);
		border-radius: var(--bulma-radius);
		background: transparent;
		cursor: pointer;
		transition: border-color 0.2s, background-color 0.2s;
	}
	.upload-zone:hover {
		border-color: var(--color-overlay);
	}
	.upload-zone.is-dragover {
		border-color: var(--color-primary);
		background-color: var(--color-primary-muted);
	}
</style>
