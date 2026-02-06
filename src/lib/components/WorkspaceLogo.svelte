<script lang="ts">
	interface Props {
		workspaceId: string;
		logoFilename: string | null;
		name: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { workspaceId, logoFilename, name, size = 'md' }: Props = $props();

	// Generate 2-letter abbreviation from name
	function getAbbreviation(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	}

	const abbreviation = $derived(getAbbreviation(name));
	const logoUrl = $derived(logoFilename ? `/api/logo/${workspaceId}/${logoFilename}` : null);
</script>

{#if logoUrl}
	<img
		src={logoUrl}
		alt="{name} logo"
		class="workspace-logo workspace-logo--{size}"
	/>
{:else}
	<div class="workspace-logo workspace-logo--{size} workspace-logo--fallback">
		{abbreviation}
	</div>
{/if}

<style>
	.workspace-logo {
		border-radius: 0.5rem;
		flex-shrink: 0;
	}
	.workspace-logo--sm {
		width: 2rem;
		height: 2rem;
		font-size: 0.75rem;
	}
	.workspace-logo--md {
		width: 2.5rem;
		height: 2.5rem;
		font-size: 0.875rem;
	}
	.workspace-logo--lg {
		width: 4rem;
		height: 4rem;
		font-size: 1.25rem;
	}
	img.workspace-logo {
		object-fit: cover;
	}
	.workspace-logo--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-primary);
		color: white;
		font-weight: 700;
	}
</style>
