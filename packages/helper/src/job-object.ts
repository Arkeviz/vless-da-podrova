/**
 * Windows Job Object с KILL_ON_JOB_CLOSE: дескриптор job живёт, пока жив хелпер.
 * Когда хелпер завершается любым способом (в том числе убит браузером), ОС закрывает
 * дескриптор и убивает все процессы в job — sing-box не остаётся «сиротой».
 */
import { dlopen, FFIType, ptr, type Pointer } from 'bun:ffi'

const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS = 9
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
// sizeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION) на x64; LimitFlags лежит по смещению 16.
const EXTENDED_LIMIT_INFORMATION_SIZE = 144
const LIMIT_FLAGS_OFFSET = 16
const PROCESS_SET_QUOTA = 0x0100
const PROCESS_TERMINATE = 0x0001

const kernel32 = dlopen('kernel32.dll', {
  CreateJobObjectW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  SetInformationJobObject: {
    args: [FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.u32],
    returns: FFIType.i32,
  },
  OpenProcess: { args: [FFIType.u32, FFIType.i32, FFIType.u32], returns: FFIType.ptr },
  AssignProcessToJobObject: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
  CloseHandle: { args: [FFIType.ptr], returns: FFIType.i32 },
  GetLastError: { args: [], returns: FFIType.u32 },
})

const { symbols } = kernel32

let job: Pointer | null = null

function getJob(): Pointer {
  if (job) return job

  const handle = symbols.CreateJobObjectW(null, null)
  if (!handle) throw new Error(`CreateJobObjectW: ошибка ${symbols.GetLastError()}`)

  const info = new Uint8Array(EXTENDED_LIMIT_INFORMATION_SIZE)
  new DataView(info.buffer).setUint32(LIMIT_FLAGS_OFFSET, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, true)
  const ok = symbols.SetInformationJobObject(
    handle,
    JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS,
    ptr(info),
    EXTENDED_LIMIT_INFORMATION_SIZE,
  )
  if (!ok) {
    symbols.CloseHandle(handle)
    throw new Error(`SetInformationJobObject: ошибка ${symbols.GetLastError()}`)
  }

  // Дескриптор намеренно не закрываем: его закроет ОС при завершении хелпера.
  job = handle as Pointer
  return job
}

export function assignToKillOnCloseJob(pid: number): void {
  const process = symbols.OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid)
  if (!process) throw new Error(`OpenProcess(${pid}): ошибка ${symbols.GetLastError()}`)
  try {
    if (!symbols.AssignProcessToJobObject(getJob(), process)) {
      throw new Error(`AssignProcessToJobObject: ошибка ${symbols.GetLastError()}`)
    }
  } finally {
    symbols.CloseHandle(process)
  }
}
