# 劫持并修改https响应体（二）

### Hook windows API

承接上篇，既然浏览器插件那么麻烦，那么桌面端会不会容易一点呢？例如 Fiddler 或一些代理工具和游戏加速器，他们能劫持系统的流量并修改。

### Detours 库

经过一番查阅，决定尝试使用 [Detours](https://github.com/microsoft/Detours) 库来对 windows 网络相关 api 进行 hook。

Detours 库的安装方法可参考这篇文章：[微软开源HOOK框架 Detours使用方法 -bilibili](https://www.bilibili.com/opus/904922246034751491) 按照文章中的步骤配置完之后，如果仍然提示找不到 Detours，把x86和x64编译模式切换一下就好了。

经过一番尝试，无数次的 debug，成功 hook 了 自己 demo 中的 MessageBoxA 函数

![1744777687049](image/劫持并修改https响应体(二)/1744777687049.png)

相关代码

```c
#include <stdio.h>
#include <stdlib.h>
#include <Windows.h>
#include <detours.h>
#pragma comment(lib, "detours.lib")

static int (WINAPI* OldMessageBoxA)(
	HWND hWnd,
	LPCSTR lpText,
	LPCSTR lpCaption,
	UINT uType
	) = MessageBoxA;

int WINAPI NewMessageBoxA(HWND hWnd, LPCSTR lpText, LPCSTR lpCaption, UINT uType) {
	char szBuf[1024] = { 0 }; // 初始化缓冲区
	strcpy(szBuf, (char*)lpText); // 使用 strcpy 复制原始文本
	strcat(szBuf, " [hooked]");
	return OldMessageBoxA(hWnd, szBuf, lpCaption, uType);
}

void InstallHook(PVOID* oldFunction, PVOID newFunction) {
	DetourRestoreAfterWith();
	DetourTransactionBegin();
	DetourUpdateThread(GetCurrentThread());
	DetourAttach(oldFunction, newFunction);
	DetourTransactionCommit();
}

void UninstallHook(PVOID* oldFunction, PVOID newFunction) {
	DetourRestoreAfterWith();
	DetourTransactionBegin();
	DetourUpdateThread(GetCurrentThread());
	DetourDetach(oldFunction, newFunction);
	DetourTransactionCommit();
}

int main() {

	InstallHook((PVOID*)&OldMessageBoxA, NewMessageBoxA);

	MessageBoxA(0, "123", "456", 0);

	UninstallHook((PVOID*)&OldMessageBoxA, NewMessageBoxA);

	MessageBoxA(0, "123", "456", 0);

	system("pause");

	return 0;
}

```

### dll 编写

问题又来了，上面这种 hook 只能 hook 自身进程，对别的进程无效。又经过一番查阅，需要将其编译成 dll，之后注入到目标进程，于是开始学习如何编译 dll，最后成功导出了 dll，代码如下

```c
#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <iostream>
#include <Windows.h>

#include <detours.h>
#pragma comment(lib, "detours.lib")

using namespace std;

static int (WINAPI* OldMessageBoxA)(
	HWND hWnd,
	LPCSTR lpText,
	LPCSTR lpCaption,
	UINT uType
	) = MessageBoxA;

int WINAPI NewMessageBoxA(HWND hWnd, LPCSTR lpText, LPCSTR lpCaption, UINT uType) {
	char szBuf[1024] = { 0 };
	strcpy(szBuf, (char*)lpText);
	strcat(szBuf, " [hooked]");
	return OldMessageBoxA(hWnd, szBuf, lpCaption, uType);
}

void InstallHook(PVOID* oldFunction, PVOID newFunction) {
	DetourRestoreAfterWith();
	DetourTransactionBegin();
	DetourUpdateThread(GetCurrentThread());
	DetourAttach(oldFunction, newFunction);
	DetourTransactionCommit();
}

void UninstallHook(PVOID* oldFunction, PVOID newFunction) {
	DetourRestoreAfterWith();
	DetourTransactionBegin();
	DetourUpdateThread(GetCurrentThread());
	DetourDetach(oldFunction, newFunction);
	DetourTransactionCommit();
}

bool IsHookedFlag = false;
void OnDLLThreadAttach() {
	if (IsHookedFlag) return;

	InstallHook((PVOID*)&OldMessageBoxA, NewMessageBoxA);

	IsHookedFlag = true;

	MessageBoxA(0, "DLL 注入成功，钩子已挂载", "提示", 0);

	//创建控制台窗口
	AllocConsole();
	// 将标准输出流重定向到控制台
	freopen("CONOUT$", "w", stdout);

	cout << "【正在监听】" << endl;
}


bool APIENTRY DllMain(HMODULE hModule, DWORD  ul_reason_for_call, LPVOID lpReserved) {

	switch (ul_reason_for_call) {

	case DLL_PROCESS_ATTACH: {
		//MessageBoxA(0, "DLL 注入成功，DllMain 已执行", "DLL_PROCESS_ATTACH", 0);

		break;
	}
	case DLL_THREAD_ATTACH: {

		OnDLLThreadAttach();

		//MessageBoxA(0, "DLL 注入成功，DllMain 已执行", "DLL_THREAD_ATTACH", 0);
		break;
	}
	case DLL_THREAD_DETACH: {
		//MessageBoxA(0, "DLL 注入成功，DllMain 已执行", "DLL_THREAD_DETACH", 0);

		break;
	}
	case DLL_PROCESS_DETACH: {
		//MessageBoxA(0, "DLL 注入成功，DllMain 已执行", "DLL_PROCESS_DETACH", 0);

		break;
	}
	default: {
		//MessageBoxA(0, "DLL 注入成功，DllMain 已执行", "提示", 0);
		break;
	}

	}
	return true;
}

_declspec(dllexport) void WinHookEnty() {

	MessageBoxA(0, "DLL 导出函数 WinHookEnty 已执行", "提示", 0);

	InstallHook((PVOID*)&OldMessageBoxA, NewMessageBoxA);
}
```

### dll 注入

之后开始研究如何将编译好的 dll 注入目标程序并执行，经过一番要命的 debug，成功将上面生成的 dll 注入了目标程序，代码如下

```c
#include <string>
#include <iostream>
#include <iomanip>
#include <windows.h>
#include <tlhelp32.h>
#include <vector>
#include <Psapi.h> 
using namespace std;

DWORD PrintProcessInfo();
string WcharToMByte(const wchar_t* wStr);
DWORD FindProcessIDByName(const char* processName);
bool InjectDLLByPID(DWORD dwProcessId, const char* dllPath);


int main() {

	const char* processName = "msedge.exe";
	//const char* processName = "test01.exe";
	const char* dllPath = "C:/Users/Jawon/Desktop/c_projects/winHook/x64/Release/winHook_dll.dll";

	DWORD pid = FindProcessIDByName(processName);
	if (pid == NULL) {
		cout << "未获取到 pid" << endl;
		getchar();
		return;
	}

	if (InjectDLLByPID(pid, dllPath)) {
		cout << "DLL 注入成功！" << endl;
	}
	else {
		cout << "DLL 注入失败！" << endl;
	}

	cout << "\n\n按任意键退出。";

	getchar();

	return 0;
}


DWORD PrintProcessInfo() {
	HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (INVALID_HANDLE_VALUE == hSnapshot) {
		return NULL;
	}

	PROCESSENTRY32 preocessEntry32 = { sizeof(preocessEntry32) };
	BOOL ret = Process32First(hSnapshot, &preocessEntry32);
	while (ret) {
		string currentProcessName = WcharToMByte(preocessEntry32.szExeFile);
		cout << "[" << preocessEntry32.th32ProcessID << "]\t" << currentProcessName << endl;
		ret = Process32Next(hSnapshot, &preocessEntry32);
	}
	CloseHandle(hSnapshot);
	return NULL;
}

DWORD FindProcessIDByName(const char* processName) {
	HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (INVALID_HANDLE_VALUE == hSnapshot) {
		return NULL;
	}

	PROCESSENTRY32 preocessEntry32 = { sizeof(preocessEntry32) };
	BOOL ret = Process32First(hSnapshot, &preocessEntry32);
	while (ret) {
		string currentProcessName = WcharToMByte(preocessEntry32.szExeFile);
		if (currentProcessName == processName) {
			CloseHandle(hSnapshot);
			return preocessEntry32.th32ProcessID;
		}
		ret = Process32Next(hSnapshot, &preocessEntry32);
	}
	CloseHandle(hSnapshot);
	return NULL;
}

string WcharToMByte(const wchar_t* wStr) {
	int len = WideCharToMultiByte(CP_ACP, 0, wStr, -1, NULL, 0, NULL, NULL);
	if (len == 0) {
		return "";
	}
	char* mStr = new char[len];
	WideCharToMultiByte(CP_ACP, 0, wStr, -1, mStr, len, NULL, NULL);
	string result(mStr);
	delete[] mStr;
	return result;
}

bool InjectDLLByPID(DWORD dwProcessId, const char* dllPath) {
	// 打开目标进程
	HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, dwProcessId);
	if (hProcess == NULL) {
		cout << "无法打开目标进程，错误代码: " << GetLastError() << endl;
		return false;
	}

	// 在目标进程中分配内存
	SIZE_T dllPathSize = strlen(dllPath) + 1;
	LPVOID remoteDllPath = VirtualAllocEx(hProcess, NULL, dllPathSize, MEM_COMMIT, PAGE_READWRITE);
	if (remoteDllPath == NULL) {
		cout << "无法在目标进程中分配内存，错误代码: " << GetLastError() << endl;
		CloseHandle(hProcess);
		return false;
	}

	// 将 DLL 路径写入目标进程的内存
	if (!WriteProcessMemory(hProcess, remoteDllPath, dllPath, dllPathSize, NULL)) {
		cout << "无法将 DLL 路径写入目标进程内存，错误代码: " << GetLastError() << endl;
		VirtualFreeEx(hProcess, remoteDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	// 获取 LoadLibraryA 函数的地址
	HMODULE hKernel32 = GetModuleHandleA("kernel32.dll");
	FARPROC loadLibraryAddr = GetProcAddress(hKernel32, "LoadLibraryA");
	if (loadLibraryAddr == NULL) {
		cout << "无法获取 LoadLibraryA 函数的地址，错误代码: " << GetLastError() << endl;
		VirtualFreeEx(hProcess, remoteDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	// 在目标进程中创建远程线程调用 LoadLibraryA 函数，加载 DLL
	HANDLE hRemoteThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)loadLibraryAddr, remoteDllPath, 0, NULL);
	if (hRemoteThread == NULL) {
		cout << "无法在目标进程中创建远程线程，错误代码: " << GetLastError() << endl;
		VirtualFreeEx(hProcess, remoteDllPath, 0, MEM_RELEASE);
		CloseHandle(hProcess);
		return false;
	}

	// 等待远程线程执行完毕
	WaitForSingleObject(hRemoteThread, INFINITE);

	// 获取 LoadLibraryA 的返回值
	DWORD exitCode;
	if (!GetExitCodeThread(hRemoteThread, &exitCode)) {
		cout << "[警报] 无法获取远程线程的退出码，错误代码: " << GetLastError() << endl;
	}

	// 检查 LoadLibraryA 是否成功加载 DLL
	if (exitCode == 0) {
		cout << "[警报] 如果注入无效请检查 DLL 是否存在，错误代码: " << GetLastError() << endl;
	}

	// 清理资源
	CloseHandle(hRemoteThread);
	VirtualFreeEx(hProcess, remoteDllPath, 0, MEM_RELEASE);
	CloseHandle(hProcess);

	return true;
}
```

使用上面的代码注入到 edge 浏览器后，被 hook 的 messageBox 成功弹出了，这说明 hook 生效了。

但当我想要将 MessageBoxA 函数换成我想 hook 的网络相关的 api 时，我添加了必要的头文件，之后编译器开始报错

![1744780124709](image/劫持并修改https响应体(二)/1744780124709.png)

之后我检查了 winhttp.h ，发现 WinHttpReadData 明明已经定义了，但依旧提示我未定义！！！

![1744780203865](image/劫持并修改https响应体(二)/1744780203865.png)

好吧，此时的我已经不想继续折腾了，继续下去会出人命的，这个方案暂时放一放。

---
