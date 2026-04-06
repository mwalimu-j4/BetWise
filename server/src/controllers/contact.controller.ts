import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const createContactSchema = {
  subject: (val: any) =>
    typeof val === "string" &&
    val.trim().length >= 3 &&
    val.trim().length <= 100,
  message: (val: any) =>
    typeof val === "string" &&
    val.trim().length >= 10 &&
    val.trim().length <= 2000,
  fullName: (val: any) =>
    typeof val === "string" &&
    val.trim().length >= 2 &&
    val.trim().length <= 100,
  phone: (val: any) =>
    typeof val === "string" && /^[\d\+\-\(\)\s]{7,20}$/.test(val.trim()),
};

type CreateContactPayload = {
  subject: string;
  message: string;
  fullName: string;
  phone: string;
};

export async function createContact(req: Request, res: Response) {
  try {
    const { subject, message, fullName, phone } = req.body;
    const userId = req.user?.id || null;

    // Validate required fields
    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      return res.status(400).json({
        message: "Subject is required and must be at least 3 characters",
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return res.status(400).json({
        message: "Message is required and must be at least 10 characters",
      });
    }

    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length < 2
    ) {
      return res.status(400).json({
        message: "Full name is required and must be at least 2 characters",
      });
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return res.status(400).json({
        message: "Phone number is required and must be at least 7 characters",
      });
    }

    if (subject.trim().length > 100) {
      return res.status(400).json({
        message: "Subject must not exceed 100 characters",
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        message: "Message must not exceed 2000 characters",
      });
    }

    if (fullName.trim().length > 100) {
      return res.status(400).json({
        message: "Full name must not exceed 100 characters",
      });
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        subject: subject.trim(),
        message: message.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
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
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
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
