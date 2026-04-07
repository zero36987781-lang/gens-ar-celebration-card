/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Upload, FileCode, Sparkles } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-neutral-200/50 p-12 text-center border border-neutral-100"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-2xl mb-8">
          <Upload className="w-10 h-10 text-blue-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-neutral-900 mb-4 tracking-tight">
          프로젝트에 오신 것을 환영합니다!
        </h1>
        
        <p className="text-lg text-neutral-600 mb-12 leading-relaxed">
          기존 파일을 업로드하여 개발을 시작해 보세요. <br />
          채팅창에 파일을 첨부하거나, 왼쪽 파일 탐색기를 이용하실 수 있습니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <FileCode className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-neutral-800 text-lg">코드 분석</h3>
            </div>
            <p className="text-neutral-500">기존 소스 코드를 주시면 분석하여 기능을 확장해 드립니다.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-neutral-800 text-lg">기능 추가</h3>
            </div>
            <p className="text-neutral-500">파일 업로드, 데이터 시각화 등 원하는 기능을 말씀해 주세요.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
