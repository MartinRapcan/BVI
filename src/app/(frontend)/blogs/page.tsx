import { getPayload, type PaginatedDocs } from "payload";
import Link from "next/link";
import type { Blog } from "@/payload-types";
import payloadConfig from "@/payload.config";
import { getCache, setCache } from "@/utils/redis-cache";

async function fetchBlogs() {
	const cacheKey = "blogs";
	const cacheTTL = 3600; // 1 hodina v sekundách

	const cachedData = (await getCache(cacheKey)) as PaginatedDocs<Blog> | null;

	if (cachedData) {
		console.log("Cache HIT for blogs");
		return cachedData;
	}

	console.log("Cache MISS for blogs");

	const payload = await getPayload({ config: payloadConfig });
	const blogs = await payload.find({
		collection: "blogs",
		limit: 10,
		sort: "-publishedAt",
	});

	if (blogs) {
		await setCache(cacheKey, blogs, cacheTTL);
	}

	return blogs;
}

export default async function BlogsPage() {
	const blogs = await fetchBlogs();

	return <RenderBlogsPage blogs={blogs} />;
}

function RenderBlogsPage({ blogs }: { blogs: PaginatedDocs<Blog> }) {
	return (
		<main className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
			<ul>
				{blogs.docs.map((blog: Blog) => (
					<li key={blog.id} className="mb-4">
						<Link
							href={`/blogs/${blog.slug}`}
							className="text-blue-500 hover:underline"
						>
							{blog.title}
						</Link>
						{blog.publishedAt && (
							<p className="text-gray-500 text-sm">
								{new Date(blog.publishedAt).toDateString()}
							</p>
						)}
					</li>
				))}
			</ul>
		</main>
	);
}
