import payload, { getPayload } from "payload";
import Link from "next/link";
import type { Blog } from "@/payload-types";
import payloadConfig from "@/payload.config";

export default async function BlogsPage() {
	const payload = await getPayload({ config: payloadConfig });

	const blogs = await payload.find({
		collection: "blogs",
		limit: 10,
		sort: "-publishedAt",
	});

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
