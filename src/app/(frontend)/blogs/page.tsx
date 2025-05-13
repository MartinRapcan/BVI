// // This is a simple wrapper to avoid type issues

import type { Blog } from "@/payload-types";
import payloadConfig from "@/payload.config";
import { getCache, setCache } from "@/utils/redis-cache";
import Link from "next/link";
import { getPayload, type PaginatedDocs } from "payload";

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import type { Blog } from "@/payload-types";
// import Image from "next/image";

// export const dynamic = 'force-dynamic'; // Make sure this is dynamic

// // src/app/(frontend)/blogs/page.tsx
// export default function BlogsPageWrapper() {
// 	return <BlogsPage />;
// }

// function BlogsPage() {
// 	const [blogs, setBlogs] = useState<Blog[]>([]);
// 	const [loading, setLoading] = useState(true);
// 	const [error, setError] = useState<string | null>(null);

// 	useEffect(() => {
// 		const fetchBlogs = async () => {
// 			try {
// 				const res = await fetch("/api/blogs?pagination=false", {
// 					next: { revalidate: 0 },
// 				});
// 				if (!res.ok) {
// 					throw new Error(`Failed to fetch blogs: ${res.statusText}`);
// 				}
// 				const data = await res.json();
// 				setBlogs(data.docs); // assuming your API returns { docs: Blog[] }
// 			} catch (err: unknown) {
// 				console.error("Error fetching blogs:", err);
// 				if (err instanceof Error) {
// 					setError(err.message);
// 				} else {
// 					setError("An unknown error occurred");
// 				}
// 			} finally {
// 				setLoading(false);
// 			}
// 		};

// 		fetchBlogs();
// 	}, []);

// 	return (
// 		<main className="w-full flex justify-center items-center">
// 			<div className="max-w-7xl w-full m-4 flex-col flex">
// 				<h1 className="text-3xl font-bold mb-6">Blogs</h1>
// 				{loading ? (
// 					<div className="flex justify-center items-center h-96">
// 						<svg
// 							aria-hidden="true"
// 							className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
// 							viewBox="0 0 100 101"
// 							fill="none"
// 							xmlns="http://www.w3.org/2000/svg"
// 						>
// 							<path
// 								d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
// 								fill="currentColor"
// 							/>
// 							<path
// 								d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
// 								fill="currentFill"
// 							/>
// 						</svg>
// 						<span className="sr-only">Loading...</span>
// 					</div>
// 				) : !error && blogs.length ? (
// 					<div className="grid grid-cols-12 gap-4 mb-6">
// 						{blogs.map((blog) => (
// 							<div
// 								key={blog.id}
// 								className="col-span-12 sm:col-span-6 lg:col-span-4 mb-4"
// 							>
// 								<Link
// 									href={`/blogs/${blog.id}`}
// 									className="text-blue-500 hover:underline flex flex-col"
// 								>
// 									{blog.title} - {blog.id}
// 									<Image
// 										src={`https://random-image-pepebigotes.vercel.app/api/random-image?rand=${Math.random()}`}
// 										alt={blog.title}
// 										sizes="100vw"
// 										width={0}
// 										height={0}
// 										className="w-full max-h-40 object-cover"
// 									/>
// 								</Link>
// 								{blog.publishedAt && (
// 									<p className="text-gray-500 text-sm">
// 										{new Date(blog.publishedAt).toDateString()}
// 									</p>
// 								)}
// 							</div>
// 						))}
// 					</div>
// 				) : (
// 					<div className="flex justify-center items-center h-96">
// 						<p className="text-gray-500">No blogs found.</p>
// 					</div>
// 				)}
// 			</div>
// 		</main>
// 	);
// }

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
