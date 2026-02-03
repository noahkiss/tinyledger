import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Dashboard removed - redirect to transactions as default landing page
	redirect(302, `/w/${params.workspace}/transactions`);
};
