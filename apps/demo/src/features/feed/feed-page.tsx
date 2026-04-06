"use client";

type FeedPageProps = {
  userEmail?: string;
  children: React.ReactNode;
  actionLog: React.ReactNode;
};

export function parseNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function FeedPage({ userEmail, children, actionLog }: FeedPageProps) {
  const name = userEmail ? parseNameFromEmail(userEmail) : "Гість";

  return (
    <div className="flex min-h-screen justify-center gap-[10px] bg-[#f8f8f8] p-[10px]">
      <aside className="flex h-[calc(100vh-20px)] w-[357px] flex-col justify-between p-[10px]">
        <div className="flex flex-col items-center gap-5">
          <h1 className="font-inter text-2xl font-black text-black/80">
            Demo feed
          </h1>
          <p className="font-montserrat text-sm text-black/80">
            Проєкт демонструє роботу системи рекомендацій та персоналізації
            контенту для користувачів.
          </p>
          <hr className="w-full border-black/10" />
          <p className="font-montserrat text-sm text-black/80">
            Демо проєкт реалізований у рамках дипломної роботи з дослідження
            алгоритмів персоналізації.
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-[10px] rounded-[20px] bg-white p-[10px]">
            <div className="h-[30px] w-[30px] rounded-full bg-[#d9d9d9]" />
            <p className="font-montserrat text-sm text-black/80">
              Привіт, <span className="font-bold">{name}</span>.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex w-[543px] flex-col gap-[10px]">{children}</main>

      <aside className="flex h-[calc(100vh-20px)] w-[370px] flex-col gap-[10px] p-[10px]">
        <div className="flex flex-col items-center gap-5">
          <h1 className="font-inter text-2xl font-black text-black/80">
            Логування
          </h1>
          <p className="font-montserrat text-sm text-black/80">
            Логування необхідне для збору даних про взаємодію користувача з
            контентом. Ці дані використовуються системою рекомендацій.
          </p>
          <hr className="w-full border-black/10" />
        </div>
        <div className="flex flex-1 flex-col justify-end gap-[10px] overflow-y-auto rounded-[15px] p-[10px]">
          {actionLog}
        </div>
      </aside>
    </div>
  );
}
