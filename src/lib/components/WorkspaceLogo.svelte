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

	// Size classes
	const sizeClasses = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-10 h-10 text-sm',
		lg: 'w-16 h-16 text-xl'
	};
</script>

{#if logoUrl}
	<img
		src={logoUrl}
		alt="{name} logo"
		class="rounded-lg object-cover {sizeClasses[size].split(' ').slice(0, 2).join(' ')}"
	/>
{:else}
	<div
		class="flex items-center justify-center rounded-lg bg-primary font-bold text-white {sizeClasses[
			size
		]}"
	>
		{abbreviation}
	</div>
{/if}
