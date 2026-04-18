import type { Response } from "express";

interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  response: Response<ApiSuccessResponse<T>>,
  data: T,
  message?: string,
) => {
  return response.status(200).json({
    success: true,
    message,
    data,
  });
};

export const sendCreated = <T>(
  response: Response<ApiSuccessResponse<T>>,
  data: T,
  message?: string,
) => {
  return response.status(201).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  response: Response<ApiErrorResponse>,
  statusCode: number,
  message: string,
  details?: unknown,
) => {
  return response.status(statusCode).json({
    success: false,
    error: {
      message,
      details,
    },
  });
};
