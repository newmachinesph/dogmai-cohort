import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

// ============================================
// Standardized API Response Types
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Error Codes
// ============================================

export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate Limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Server Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// Response Helpers
// ============================================

export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse["meta"],
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
    },
    { status }
  );
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, string[]>,
  status: number = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

// ============================================
// Common Error Responses
// ============================================

export function unauthorizedResponse(message = "Authentication required") {
  return errorResponse(ErrorCodes.UNAUTHORIZED, message, undefined, 401);
}

export function forbiddenResponse(message = "Access denied") {
  return errorResponse(ErrorCodes.FORBIDDEN, message, undefined, 403);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(
    ErrorCodes.NOT_FOUND,
    `${resource} not found`,
    undefined,
    404
  );
}

export function validationErrorResponse(
  message: string,
  details?: Record<string, string[]>
) {
  return errorResponse(ErrorCodes.VALIDATION_ERROR, message, details, 400);
}

export function rateLimitedResponse(retryAfter?: number) {
  const response = errorResponse(
    ErrorCodes.RATE_LIMITED,
    "Too many requests. Please try again later.",
    undefined,
    429
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}

export function internalErrorResponse(message = "An unexpected error occurred") {
  return errorResponse(ErrorCodes.INTERNAL_ERROR, message, undefined, 500);
}

// ============================================
// Zod Validation Helper
// ============================================

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return details;
}

export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ApiErrorResponse> }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: validationErrorResponse(
          "Validation failed",
          formatZodErrors(result.error)
        ),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: validationErrorResponse("Invalid JSON body"),
    };
  }
}

export function validateQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ApiErrorResponse> } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      response: validationErrorResponse(
        "Invalid query parameters",
        formatZodErrors(result.error)
      ),
    };
  }

  return { success: true, data: result.data };
}

// ============================================
// Pagination Helper
// ============================================

export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): ApiSuccessResponse["meta"] {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// Error Handler Wrapper
// ============================================

export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Error:", error);

      // Check for Prisma errors
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string"
      ) {
        if (error.code === "P2002") {
          return errorResponse(
            ErrorCodes.ALREADY_EXISTS,
            "A record with this value already exists",
            undefined,
            409
          );
        }
        if (error.code === "P2025") {
          return notFoundResponse();
        }
      }

      return internalErrorResponse();
    }
  };
}

// ============================================
// Additional Common Responses
// ============================================

export function createdResponse<T>(data: T, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status: 201 }
  );
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function conflictResponse(message = "Resource already exists") {
  return errorResponse(ErrorCodes.CONFLICT, message, undefined, 409);
}

export function payloadTooLargeResponse(maxSizeMB: number) {
  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    `Request body too large. Maximum size is ${maxSizeMB}MB`,
    undefined,
    413
  );
}

export function csrfErrorResponse() {
  return errorResponse(
    ErrorCodes.FORBIDDEN,
    "Invalid or missing CSRF token",
    undefined,
    403
  );
}
