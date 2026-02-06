<script lang="ts">
	import { page } from '$app/stores';
</script>

<section class="section" data-component="error-page">
	<div class="container has-text-centered" style="max-width: 32rem;">
		<!-- Penny looking apologetic -->
		<figure class="image is-inline-block mb-5" style="max-width: 16rem;">
			<img
				src="/brand/mascot-sitting-transparent.png"
				alt="Penny the Hedgehog"
				style="opacity: 0.8;"
			/>
		</figure>

		<!-- Error code -->
		<h1 class="title is-1 has-text-grey">
			{$page.status}
		</h1>

		<!-- Error message -->
		<p class="subtitle is-5 has-text-grey mb-5">
			{#if $page.status === 404}
				Penny couldn't find that page.
			{:else if $page.status >= 500}
				Something went wrong on our end.
			{:else}
				{$page.error?.message || "Something went wrong."}
			{/if}
		</p>

		<!-- Actions -->
		<div class="buttons is-centered">
			<a
				href="/"
				class="button is-primary"
			>
				Go home
			</a>
			<button
				onclick={() => history.back()}
				class="button"
			>
				Go back
			</button>
		</div>
	</div>
</section>
