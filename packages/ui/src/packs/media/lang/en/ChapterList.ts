export const words = {
  chapterList: {
    line: (time: string, title: string, current: boolean) =>
      `${time} ${title}${current ? " · Current chapter" : ""}`,
  },
};
