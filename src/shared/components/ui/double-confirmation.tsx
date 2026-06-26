import { useState, useCallback } from 'react';
import { useConfirmationAlert, ConfirmationType } from './confirmation-alert';
import { useCustomAlert, AlertType } from './custom-alert';

export interface DoubleConfirmationAction {
  type: 'create' | 'edit' | 'delete';
  itemName: string;
  confirmTitle: string;
  confirmMessage: string;
  successTitle: string;
  successMessage: string;
  onExecute: () => void | Promise<void>;
  requireInput?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export function useDoubleConfirmation() {
  const { confirmDelete, confirmEdit, ConfirmationContainer } = useConfirmationAlert();
  const { success, created, edited, deleted, AlertContainer } = useCustomAlert();

  const executeAction = useCallback(async (action: DoubleConfirmationAction) => {
    const handleConfirm = async () => {
      try {
        // Ejecutar la acción
        await Promise.resolve(action.onExecute());

        // Mostrar alerta de éxito según el tipo
        switch (action.type) {
          case 'create':
            created(action.successTitle, action.successMessage);
            break;
          case 'edit':
            edited(action.successTitle, action.successMessage);
            break;
          case 'delete':
            deleted(action.successTitle, action.successMessage);
            break;
        }
      } catch (error) {
        // Error handling - could be replaced with proper logging service
      }
    };

    // Mostrar confirmación según el tipo
    if (action.type === 'delete') {
      confirmDelete(
        action.itemName,
        handleConfirm,
        {
          title: action.confirmTitle,
          message: action.confirmMessage,
          requireInput: action.requireInput ?? true,
          confirmButtonText: action.confirmButtonText,
          cancelButtonText: action.cancelButtonText
        }
      );
    } else {
      confirmEdit(
        action.itemName,
        handleConfirm,
        {
          title: action.confirmTitle,
          message: action.confirmMessage
        }
      );
    }
  }, [confirmDelete, confirmEdit, created, edited, deleted]);

  // Métodos específicos para cada tipo de acción
  const confirmCreateAction = useCallback((
    itemName: string,
    onExecute: () => void | Promise<void>,
    options?: {
      confirmTitle?: string;
      confirmMessage?: string;
      successTitle?: string;
      successMessage?: string;
      requireInput?: boolean;
    }
  ) => {
    executeAction({
      type: 'create',
      itemName,
      confirmTitle: options?.confirmTitle || 'Confirmar Creación',
      confirmMessage: options?.confirmMessage || `¿Estás seguro de que deseas crear "${itemName}"?`,
      successTitle: options?.successTitle || 'Elemento creado exitosamente',
      successMessage: options?.successMessage || `"${itemName}" ha sido creado en el sistema.`,
      onExecute,
      requireInput: options?.requireInput
    });
  }, [executeAction]);

  const confirmEditAction = useCallback((
    itemName: string,
    onExecute: () => void | Promise<void>,
    options?: {
      confirmTitle?: string;
      confirmMessage?: string;
      successTitle?: string;
      successMessage?: string;
      requireInput?: boolean;
    }
  ) => {
    executeAction({
      type: 'edit',
      itemName,
      confirmTitle: options?.confirmTitle || 'Confirmar Edición',
      confirmMessage: options?.confirmMessage || `¿Estás seguro de que deseas editar "${itemName}"?`,
      successTitle: options?.successTitle || 'Elemento editado exitosamente',
      successMessage: options?.successMessage || `"${itemName}" ha sido actualizado en el sistema.`,
      onExecute,
      requireInput: options?.requireInput
    });
  }, [executeAction]);

  const confirmDeleteAction = useCallback((
    itemName: string,
    onExecute: () => void | Promise<void>,
    options?: {
      confirmTitle?: string;
      confirmMessage?: string;
      successTitle?: string;
      successMessage?: string;
      requireInput?: boolean;
      confirmButtonText?: string;
      cancelButtonText?: string;
    }
  ) => {
    executeAction({
      type: 'delete',
      itemName,
      confirmTitle: options?.confirmTitle || 'Confirmar Eliminación',
      confirmMessage: options?.confirmMessage || `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      successTitle: options?.successTitle || 'Elemento eliminado exitosamente',
      successMessage: options?.successMessage || `"${itemName}" ha sido eliminado del sistema.`,
      onExecute,
      requireInput: options?.requireInput ?? true,
      confirmButtonText: options?.confirmButtonText,
      cancelButtonText: options?.cancelButtonText
    });
  }, [executeAction]);

  const doubleConfirmationContainer = (
    <>
      {ConfirmationContainer}
      {AlertContainer}
    </>
  );

  return {
    confirmCreateAction,
    confirmEditAction,
    confirmDeleteAction,
    DoubleConfirmationContainer: doubleConfirmationContainer,
  };
}
