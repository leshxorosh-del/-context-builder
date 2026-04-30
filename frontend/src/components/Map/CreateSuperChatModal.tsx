import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@components/common/Button';
import Input from '@components/common/Input';

interface CreateSuperChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}

/**
 * Modal for creating a new super-chat
 */
export default function CreateSuperChatModal({
  isOpen,
  onClose,
  onCreate,
}: CreateSuperChatModalProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Введите название');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onCreate(title.trim());
      setTitle('');
      onClose();
    } catch (err) {
      setError('Не удалось создать супер-чат');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setTitle('');
      setError('');
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-accent-600" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Новый супер-чат
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Супер-чат объединяет контекст из нескольких чатов в единую базу знаний.
                  Вы сможете задавать вопросы, используя информацию из всех связанных источников.
                </p>

                <form onSubmit={handleSubmit}>
                  <Input
                    label="Название"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Проект Alpha"
                    error={error}
                    autoFocus
                  />

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isCreating}
                      className="flex-1"
                    >
                      Создать
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
