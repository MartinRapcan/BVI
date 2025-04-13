// app/api/blogs/[slug]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import payloadConfig from "@/payload.config";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const id = (await params).id; 
		const payload = await getPayload({ config: payloadConfig });

		const blog = await payload.find({
			collection: "blogs",
			where: {
				slug: {
					equals: id,
				},
			},
      depth: 1,
			limit: 1,
      pagination: false,
		});

		if (!blog.docs.length) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		return NextResponse.json(blog.docs[0]);
	} catch (err) {
		console.error("Error fetching blog:", err);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}