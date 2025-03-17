import type { PaginatedDocs } from "payload";
import Link from "next/link";
import type { Blog } from "@/payload-types";

type Res = "failed" | "rate-limited";

async function fetchBlogs(): Promise<PaginatedDocs<Blog> | Res> {
	try {
		const response = await fetch("http://localhost:3000/api/blogs");

		if (response.status === 500) {
			const retryAfter = response.headers.get("Retry-After");
			console.warn(
				`Rate limit prekročený. Skúste to znova o ${retryAfter} sekúnd.`,
			);
			return "rate-limited";
		}

		if (!response.ok) {
			throw new Error("Failed to fetch blogs");
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error:", error);
		return "failed";
	}
}

export default async function BlogsPage() {
	const blogs = await fetchBlogs();

	if (blogs === "rate-limited") {
		return (
			<main className="max-w-4xl mx-auto p-6">
				Rate limit exceeded. Please try again later.
			</main>
		);
	}

	if (blogs === "failed") {
		return <main className="max-w-4xl mx-auto p-6">Failed to fetch blogs</main>;
	}

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
