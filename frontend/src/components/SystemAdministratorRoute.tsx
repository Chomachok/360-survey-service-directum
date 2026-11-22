import { Link, Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { hasSystemAdministratorRole } from '../auth/roles'

export default function SystemAdministratorRoute() {
  if (!hasSystemAdministratorRole()) {
    return (
      <section className="card mx-auto max-w-2xl text-center" role="alert">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-directum-orange dark:bg-orange-950/40">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-xl font-bold text-directum-dark dark:text-white">Нет доступа к управлению сотрудниками</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Для этой страницы нужна роль SystemAdministrator. Обратитесь к системному администратору.
        </p>
        <Link to="/" className="btn-secondary mt-5 inline-flex">Вернуться на главную</Link>
      </section>
    )
  }
  return <Outlet />
}
