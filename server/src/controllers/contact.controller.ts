import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const createContactSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(100, "Subject must not exceed 100 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must not exceed 2000 characters"),
});

type CreateContactPayload = z.infer<typeof createContactSchema>;

export async function createContact(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validationResult = createContactSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
    }

    const { subject, message } = validationResult.data as CreateContactPayload;
    const userId = req.user.id;

    const contact = await prisma.contact.create({
      data: {
        userId,
        subject,
        message,
        status: "SUBMITTED",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Contact message sent successfully",
      contact,
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return res.status(500).json({ message: "Failed to send contact message" });
  }
}

export async function getUserContacts(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: { userId },
        select: {
          id: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where: { userId } }),
    ]);

    return res.status(200).json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user contacts:", error);
    return res.status(500).json({ message: "Failed to fetch contacts" });
  }
}

export async function getAllContacts(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return res.status(200).json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all contacts:", error);
    return res.status(500).json({ message: "Failed to fetch contacts" });
  }
}

export async function updateContactStatus(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { contactId } = req.params;
    const { status } = req.body;

    if (!["SUBMITTED", "READ", "RESOLVED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be SUBMITTED, READ, or RESOLVED",
      });
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Contact status updated successfully",
      contact,
    });
  } catch (error) {
    console.error("Error updating contact status:", error);
    return res.status(500).json({ message: "Failed to update contact status" });
  }
}

export async function getContactDetail(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { contactId } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    return res.status(200).json({ contact });
  } catch (error) {
    console.error("Error fetching contact detail:", error);
    return res.status(500).json({ message: "Failed to fetch contact" });
  }
}
