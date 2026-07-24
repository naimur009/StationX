import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as reportsService from './reports.service';
import type { ReportQueryDto, ExportQueryDto } from './reports.validation';

export async function handleGetReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type } = req.params;

    const query = req.query as unknown as ReportQueryDto;
    const result = await reportsService.getReport(type, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleExportReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type } = req.params;

    const query = req.query as unknown as ExportQueryDto;
    const pdfBuffer = await reportsService.exportReport(type, query);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `${type}-report-${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).end(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
