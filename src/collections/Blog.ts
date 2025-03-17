import { deleteCacheByPattern, getCache } from "@/utils/redis-cache";
import type { CollectionConfig } from "payload";

const Blog: CollectionConfig = {
	slug: "blogs",
	labels: {
		singular: "Blog",
		plural: "Blogs",
	},
	admin: {
		useAsTitle: "title",
	},
	access: {
		read: () => true, // Publicly readable
	},
	fields: [
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "slug",
			type: "text",
			required: true,
			unique: true,
		},
		{
			name: "author",
			type: "relationship",
			relationTo: "users",
			required: true,
		},
		{
			name: "publishedAt",
			type: "date",
			admin: {
				date: {
					pickerAppearance: "dayOnly",
				},
			},
		},
		{
			name: "featuredImage",
			type: "upload",
			relationTo: "media",
			required: false,
		},
	],
};

export default Blog;
